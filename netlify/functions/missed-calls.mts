import type { Context } from "@netlify/functions";
import { readFileSync } from "fs";
import { join } from "path";

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  area: string;
  city: string;
  category: string;
  frequency: string;
  assignedMR: string;
  lastVisit: string | null;
  totalVisits: number;
  phone: string;
  hospital: string;
  active: boolean;
}

interface Visit {
  id: string;
  mrId: string;
  doctorId: string;
  visitDate: string;
}

interface PlannedVisit {
  date: string;
  doctorId: string;
  doctorName: string;
  area: string;
  status: string;
}

interface Planner {
  id: string;
  mrId: string;
  month: string;
  plannedVisits: PlannedVisit[];
}

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function daysSince(dateStr: string | null): number {
  if (!dateStr) return 9999;
  const last = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
}

function expectedFrequencyDays(frequency: string): number {
  switch (frequency) {
    case "Weekly": return 7;
    case "Fortnightly": return 14;
    case "Monthly": return 30;
    case "Quarterly": return 90;
    default: return 30;
  }
}

export default async (req: Request, context: Context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ success: false, message: "Method not allowed" }), {
      status: 405, headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const mrId = url.searchParams.get("mrId");
    const month = url.searchParams.get("month");

    const doctors: Doctor[] = JSON.parse(
      readFileSync(join(process.cwd(), "database", "doctors.json"), "utf-8")
    );
    const visits: Visit[] = JSON.parse(
      readFileSync(join(process.cwd(), "database", "visits.json"), "utf-8")
    );
    const planners: Planner[] = JSON.parse(
      readFileSync(join(process.cwd(), "database", "planner.json"), "utf-8")
    );

    const activeDoctors = doctors.filter((d) => d.active && (!mrId || d.assignedMR === mrId));

    // Missed calls based on frequency
    const today = new Date().toISOString().split("T")[0];
    const overdueByFrequency = activeDoctors
      .map((d) => {
        const daysSinceVisit = daysSince(d.lastVisit);
        const expectedDays = expectedFrequencyDays(d.frequency);
        const overdueDays = daysSinceVisit - expectedDays;
        return { ...d, daysSinceVisit, expectedDays, overdueDays };
      })
      .filter((d) => d.overdueDays > 0)
      .sort((a, b) => b.overdueDays - a.overdueDays);

    // Missed planned calls
    const plannedMissed: { doctorId: string; doctorName: string; area: string; plannedDate: string; daysOverdue: number }[] = [];
    const relevantPlanners = planners.filter((p) => !mrId || p.mrId === mrId);

    for (const plan of relevantPlanners) {
      if (month && !plan.month.startsWith(month)) continue;
      for (const pv of plan.plannedVisits) {
        if (pv.status === "Pending" && pv.date < today) {
          const plannedDate = new Date(pv.date);
          const now = new Date();
          const daysOverdue = Math.floor(
            (now.getTime() - plannedDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          plannedMissed.push({
            doctorId: pv.doctorId,
            doctorName: pv.doctorName,
            area: pv.area,
            plannedDate: pv.date,
            daysOverdue,
          });
        }
      }
    }

    // Doctors not visited this month
    let notVisitedThisMonth: Doctor[] = [];
    if (month) {
      const visitedThisMonth = new Set(
        visits
          .filter((v) => v.visitDate.startsWith(month) && (!mrId || v.mrId === mrId))
          .map((v) => v.doctorId)
      );
      notVisitedThisMonth = activeDoctors.filter((d) => !visitedThisMonth.has(d.id));
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          overdueByFrequency,
          plannedMissed,
          notVisitedThisMonth,
          summary: {
            overdueCount: overdueByFrequency.length,
            plannedMissedCount: plannedMissed.length,
            notVisitedThisMonthCount: notVisitedThisMonth.length,
          },
        },
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Missed calls error:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
};

export const config = {
  path: "/api/missed",
};
