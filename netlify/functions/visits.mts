import type { Context } from "@netlify/functions";
import { readFileSync } from "fs";
import { join } from "path";

interface Visit {
  id: string;
  mrId: string;
  mrName: string;
  doctorId: string;
  doctorName: string;
  specialization: string;
  visitDate: string;
  visitTime: string;
  location: string;
  productsDetailed: string[];
  sampleGiven: { productId: string; quantity: number }[];
  literatureGiven: string[];
  giftsGiven: string[];
  rxGenerated: boolean;
  rxCount: number;
  nextVisitDate: string;
  callType: string;
  visitStatus: string;
  feedbackFromDoctor: string;
  notes: string;
  gpsLocation: { lat: number; lng: number } | null;
  duration: number;
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
    const doctorId = url.searchParams.get("doctorId");
    const fromDate = url.searchParams.get("from");
    const toDate = url.searchParams.get("to");
    const month = url.searchParams.get("month"); // format: YYYY-MM
    const limit = parseInt(url.searchParams.get("limit") || "50");

    const path = join(process.cwd(), "database", "visits.json");
    const visits: Visit[] = JSON.parse(readFileSync(path, "utf-8"));

    let filtered = [...visits];

    if (mrId) filtered = filtered.filter((v) => v.mrId === mrId);
    if (doctorId) filtered = filtered.filter((v) => v.doctorId === doctorId);
    if (fromDate) filtered = filtered.filter((v) => v.visitDate >= fromDate);
    if (toDate) filtered = filtered.filter((v) => v.visitDate <= toDate);
    if (month) filtered = filtered.filter((v) => v.visitDate.startsWith(month));

    // Sort by date descending
    filtered.sort((a, b) => {
      const dateA = new Date(`${a.visitDate}T${a.visitTime || "00:00"}`).getTime();
      const dateB = new Date(`${b.visitDate}T${b.visitTime || "00:00"}`).getTime();
      return dateB - dateA;
    });

    const total = filtered.length;
    const paginated = filtered.slice(0, limit);

    // Summary stats
    const totalRx = filtered.reduce((acc, v) => acc + (v.rxCount || 0), 0);
    const uniqueDoctors = new Set(filtered.map((v) => v.doctorId)).size;
    const totalDuration = filtered.reduce((acc, v) => acc + (v.duration || 0), 0);

    return new Response(
      JSON.stringify({
        success: true,
        data: paginated,
        total,
        stats: {
          totalVisits: total,
          uniqueDoctors,
          totalRx,
          avgDuration: total > 0 ? Math.round(totalDuration / total) : 0,
        },
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Visits API error:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
};

export const config = {
  path: "/api/visits",
};
