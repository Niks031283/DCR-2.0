import type { Context } from "@netlify/functions";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

interface SampleGiven {
  productId: string;
  quantity: number;
}

interface GpsLocation {
  lat: number;
  lng: number;
}

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
  sampleGiven: SampleGiven[];
  literatureGiven: string[];
  giftsGiven: string[];
  rxGenerated: boolean;
  rxCount: number;
  nextVisitDate: string;
  callType: string;
  visitStatus: string;
  feedbackFromDoctor: string;
  notes: string;
  gpsLocation: GpsLocation | null;
  duration: number;
}

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  totalVisits: number;
  lastVisit: string;
  [key: string]: unknown;
}

function getPath(file: string) {
  return join(process.cwd(), "database", file);
}

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export default async (req: Request, context: Context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, message: "Method not allowed" }), {
      status: 405, headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();

    const {
      mrId,
      mrName,
      doctorId,
      visitDate,
      visitTime,
      location,
      productsDetailed = [],
      sampleGiven = [],
      literatureGiven = [],
      giftsGiven = [],
      rxGenerated = false,
      rxCount = 0,
      nextVisitDate,
      callType = "Planned",
      feedbackFromDoctor = "",
      notes = "",
      gpsLocation = null,
      duration = 15,
    } = body;

    if (!mrId || !doctorId || !visitDate) {
      return new Response(
        JSON.stringify({ success: false, message: "mrId, doctorId, and visitDate are required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Load doctors to get doctor details
    const doctorsData: Doctor[] = JSON.parse(readFileSync(getPath("doctors.json"), "utf-8"));
    const doctor = doctorsData.find((d) => d.id === doctorId);

    if (!doctor) {
      return new Response(
        JSON.stringify({ success: false, message: "Doctor not found" }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Load and update visits
    const visitsData: Visit[] = JSON.parse(readFileSync(getPath("visits.json"), "utf-8"));
    const newVisit: Visit = {
      id: `v${String(visitsData.length + 1).padStart(3, "0")}`,
      mrId,
      mrName: mrName || "",
      doctorId,
      doctorName: doctor.name,
      specialization: doctor.specialization,
      visitDate,
      visitTime: visitTime || new Date().toTimeString().slice(0, 5),
      location: location || doctor.name,
      productsDetailed,
      sampleGiven,
      literatureGiven,
      giftsGiven,
      rxGenerated,
      rxCount: parseInt(String(rxCount)) || 0,
      nextVisitDate: nextVisitDate || "",
      callType,
      visitStatus: "Completed",
      feedbackFromDoctor,
      notes,
      gpsLocation,
      duration: parseInt(String(duration)) || 15,
    };

    visitsData.push(newVisit);
    writeFileSync(getPath("visits.json"), JSON.stringify(visitsData, null, 2));

    // Update doctor's lastVisit and totalVisits
    const doctorIndex = doctorsData.findIndex((d) => d.id === doctorId);
    if (doctorIndex !== -1) {
      doctorsData[doctorIndex].lastVisit = visitDate;
      doctorsData[doctorIndex].totalVisits = (doctorsData[doctorIndex].totalVisits || 0) + 1;
      writeFileSync(getPath("doctors.json"), JSON.stringify(doctorsData, null, 2));
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "DCR submitted successfully",
        data: newVisit,
      }),
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    console.error("DCR create error:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
};

export const config = {
  path: "/api/dcr",
};
