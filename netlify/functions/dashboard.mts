import type { Context } from "@netlify/functions";
import { readFileSync } from "fs";
import { join } from "path";

interface Doctor {
  id: string;
  assignedMR: string;
  active: boolean;
  category: string;
  lastVisit: string | null;
}

interface Visit {
  id: string;
  mrId: string;
  visitDate: string;
  doctorId: string;
  rxCount: number;
  rxGenerated: boolean;
  callType: string;
  duration: number;
}

interface Planner {
  id: string;
  mrId: string;
  month: string;
  totalPlanned: number;
  totalCompleted: number;
  status: string;
}

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function getPath(file: string) {
  return join(process.cwd(), "database", file);
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

    const doctors: Doctor[] = JSON.parse(readFileSync(getPath("doctors.json"), "utf-8"));
    const visits: Visit[] = JSON.parse(readFileSync(getPath("visits.json"), "utf-8"));
    const planners: Planner[] = JSON.parse(readFileSync(getPath("planner.json"), "utf-8"));

    const today = new Date().toISOString().split("T")[0];
    const currentMonth = today.slice(0, 7); // YYYY-MM

    // Filter by MR if specified
    const mrDoctors = doctors.filter((d) => d.active && (!mrId || d.assignedMR === mrId));
    const mrVisits = visits.filter((v) => !mrId || v.mrId === mrId);

    const totalDoctors = mrDoctors.length;

    // Today's visits
    const todayVisits = mrVisits.filter((v) => v.visitDate === today).length;

    // This month visits
    const monthVisits = mrVisits.filter((v) => v.visitDate.startsWith(currentMonth));
    const monthVisitCount = monthVisits.length;

    // Coverage this month
    const visitedDoctorIds = new Set(monthVisits.map((v) => v.doctorId));
    const coverage = totalDoctors > 0
      ? Math.round((visitedDoctorIds.size / totalDoctors) * 100)
      : 0;

    // Total Rx this month
    const totalRxMonth = monthVisits.reduce((acc, v) => acc + (v.rxCount || 0), 0);

    // Category-wise doctor count
    const categoryCount: Record<string, number> = {};
    for (const d of mrDoctors) {
      const cat = d.category || "Unknown";
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    }

    // This month planner progress
    const currentPlan = planners.find(
      (p) => p.mrId === (mrId || "") && p.month === currentMonth
    );

    // Visits trend (last 7 days)
    const last7Days: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      last7Days.push({
        date: dateStr,
        count: mrVisits.filter((v) => v.visitDate === dateStr).length,
      });
    }

    // Doctors not visited this month
    const uncoveredCount = totalDoctors - visitedDoctorIds.size;

    // Recent visits (last 5)
    const recentVisits = [...mrVisits]
      .filter((v) => v.visitDate <= today)
      .sort((a, b) => b.visitDate.localeCompare(a.visitDate))
      .slice(0, 5);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          totalDoctors,
          todayVisits,
          coverage,
          monthVisitCount,
          totalRxMonth,
          uncoveredDoctors: uncoveredCount,
          categoryCount,
          currentPlan: currentPlan
            ? {
                totalPlanned: currentPlan.totalPlanned,
                totalCompleted: currentPlan.totalCompleted,
                status: currentPlan.status,
                achievementPercent:
                  currentPlan.totalPlanned > 0
                    ? Math.round(
                        (currentPlan.totalCompleted / currentPlan.totalPlanned) * 100
                      )
                    : 0,
              }
            : null,
          last7Days,
          recentVisits,
        },
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Dashboard error:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
};

export const config = {
  path: "/api/dashboard",
};
