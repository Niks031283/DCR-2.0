import type { Context } from "@netlify/functions";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  degree: string;
  hospital: string;
  address: string;
  area: string;
  city: string;
  phone: string;
  category: string;
  frequency: string;
  assignedMR: string;
  lastVisit: string | null;
  totalVisits: number;
  active: boolean;
  notes: string;
}

function getDoctorsPath() {
  return join(process.cwd(), "database", "doctors.json");
}

function loadDoctors(): Doctor[] {
  const data = readFileSync(getDoctorsPath(), "utf-8");
  return JSON.parse(data);
}

function saveDoctors(doctors: Doctor[]): void {
  writeFileSync(getDoctorsPath(), JSON.stringify(doctors, null, 2), "utf-8");
}

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

export default async (req: Request, context: Context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);

  try {
    // GET all doctors
    if (req.method === "GET") {
      const doctors = loadDoctors();
      const mrId = url.searchParams.get("mrId");
      const area = url.searchParams.get("area");
      const category = url.searchParams.get("category");
      const search = url.searchParams.get("search");

      let filtered = doctors.filter((d) => d.active);

      if (mrId) filtered = filtered.filter((d) => d.assignedMR === mrId);
      if (area) filtered = filtered.filter((d) => d.area.toLowerCase() === area.toLowerCase());
      if (category) filtered = filtered.filter((d) => d.category === category);
      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(
          (d) =>
            d.name.toLowerCase().includes(s) ||
            d.specialization.toLowerCase().includes(s) ||
            d.hospital.toLowerCase().includes(s) ||
            d.area.toLowerCase().includes(s)
        );
      }

      return new Response(
        JSON.stringify({ success: true, data: filtered, total: filtered.length }),
        { status: 200, headers: corsHeaders }
      );
    }

    // POST create doctor
    if (req.method === "POST") {
      const body = await req.json();
      const doctors = loadDoctors();

      const newDoctor: Doctor = {
        id: `d${String(doctors.length + 1).padStart(3, "0")}`,
        name: body.name,
        specialization: body.specialization || "",
        degree: body.degree || "",
        hospital: body.hospital || "",
        address: body.address || "",
        area: body.area || "",
        city: body.city || "",
        phone: body.phone || "",
        category: body.category || "C",
        frequency: body.frequency || "Monthly",
        assignedMR: body.assignedMR || "",
        lastVisit: null,
        totalVisits: 0,
        active: true,
        notes: body.notes || "",
      };

      if (!newDoctor.name) {
        return new Response(
          JSON.stringify({ success: false, message: "Doctor name is required" }),
          { status: 400, headers: corsHeaders }
        );
      }

      doctors.push(newDoctor);
      saveDoctors(doctors);

      return new Response(
        JSON.stringify({ success: true, message: "Doctor added successfully", data: newDoctor }),
        { status: 201, headers: corsHeaders }
      );
    }

    // PUT update doctor
    if (req.method === "PUT") {
      const body = await req.json();
      const { id, ...updates } = body;
      const doctors = loadDoctors();

      const index = doctors.findIndex((d) => d.id === id);
      if (index === -1) {
        return new Response(
          JSON.stringify({ success: false, message: "Doctor not found" }),
          { status: 404, headers: corsHeaders }
        );
      }

      doctors[index] = { ...doctors[index], ...updates };
      saveDoctors(doctors);

      return new Response(
        JSON.stringify({ success: true, message: "Doctor updated", data: doctors[index] }),
        { status: 200, headers: corsHeaders }
      );
    }

    // DELETE doctor
    if (req.method === "DELETE") {
      const id = url.searchParams.get("id");
      const doctors = loadDoctors();
      const index = doctors.findIndex((d) => d.id === id);

      if (index === -1) {
        return new Response(
          JSON.stringify({ success: false, message: "Doctor not found" }),
          { status: 404, headers: corsHeaders }
        );
      }

      doctors[index].active = false;
      saveDoctors(doctors);

      return new Response(
        JSON.stringify({ success: true, message: "Doctor deactivated" }),
        { status: 200, headers: corsHeaders }
      );
    }

    return new Response(JSON.stringify({ success: false, message: "Method not allowed" }), {
      status: 405, headers: corsHeaders,
    });
  } catch (error) {
    console.error("Doctors API error:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
};

export const config = {
  path: "/api/doctors",
};
