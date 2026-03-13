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
  assignedMR: string;
  lastVisit: string | null;
  totalVisits: number;
  active: boolean;
}

interface Visit {
  id: string;
  mrId: string;
  doctorId: string;
  doctorName: string;
  visitDate: string;
  rxCount: number;
  callType: string;
}

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

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
    const month = url.searchParams.get("month"); // YYYY-MM

    const doctors: Doctor[] = JSON.parse(
      readFileSync(join(process.cwd(), "database", "doctors.json"), "utf-8")
    );
    const visits: Visit[] = JSON.parse(
      readFileSync(join(process.cwd(), "database", "visits.json"), "utf-8")
    );

    const activeDoctors = doctors.filter((d) => d.active && (!mrId || d.assignedMR === mrId));
    const totalDoctors = activeDoctors.length;

    let filteredVisits = visits;
    if (mrId) filteredVisits = visits.filter((v) => v.mrId === mrId);
    if (month) filteredVisits = filteredVisits.filter((v) => v.visitDate.startsWith(month));

    const visitedDoctorIds = new Set(filteredVisits.map((v) => v.doctorId));
    const coveredDoctors = activeDoctors.filter((d) => visitedDoctorIds.has(d.id));
    const uncoveredDoctors = activeDoctors.filter((d) => !visitedDoctorIds.has(d.id));

    const coveragePercent = totalDoctors > 0
      ? Math.round((coveredDoctors.length / totalDoctors) * 100)
      : 0;

    // Coverage by category
    const categoryBreakdown: Record<string, { total: number; covered: number; percent: number }> = {};
    for (const doc of activeDoctors) {
      const cat = doc.category || "Unknown";
      if (!categoryBreakdown[cat]) categoryBreakdown[cat] = { total: 0, covered: 0, percent: 0 };
      categoryBreakdown[cat].total++;
      if (visitedDoctorIds.has(doc.id)) categoryBreakdown[cat].covered++;
    }
    for (const cat in categoryBreakdown) {
      const { total, covered } = categoryBreakdown[cat];
      categoryBreakdown[cat].percent = total > 0 ? Math.round((covered / total) * 100) : 0;
    }

    // Coverage by area
    const areaBreakdown: Record<string, { total: number; covered: number; percent: number }> = {};
    for (const doc of activeDoctors) {
      const area = doc.area || "Unknown";
      if (!areaBreakdown[area]) areaBreakdown[area] = { total: 0, covered: 0, percent: 0 };
      areaBreakdown[area].total++;
      if (visitedDoctorIds.has(doc.id)) areaBreakdown[area].covered++;
    }
    for (const area in areaBreakdown) {
      const { total, covered } = areaBreakdown[area];
      areaBreakdown[area].percent = total > 0 ? Math.round((covered / total) * 100) : 0;
    }

    // Visit frequency per doctor
    const doctorVisitMap: Record<string, number> = {};
    for (const v of filteredVisits) {
      doctorVisitMap[v.doctorId] = (doctorVisitMap[v.doctorId] || 0) + 1;
    }

    const coveredDoctorDetails = coveredDoctors.map((d) => ({
      ...d,
      visitsThisMonth: doctorVisitMap[d.id] || 0,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          summary: {
            totalDoctors,
            coveredDoctors: coveredDoctors.length,
            uncoveredDoctors: uncoveredDoctors.length,
            coveragePercent,
            totalVisits: filteredVisits.length,
            month: month || "All Time",
          },
          categoryBreakdown,
          areaBreakdown,
          coveredDoctors: coveredDoctorDetails,
          uncoveredDoctors,
        },
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Coverage report error:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
};

export const config = {
  path: "/api/coverage",
};
