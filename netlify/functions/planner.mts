import type { Context } from "@netlify/functions";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

interface PlannedVisit {
  date: string;
  doctorId: string;
  doctorName: string;
  area: string;
  visitType: string;
  status: string;
}

interface Planner {
  id: string;
  mrId: string;
  month: string;
  monthName: string;
  status: string;
  approvedBy: string | null;
  submittedOn: string | null;
  approvedOn: string | null;
  plannedVisits: PlannedVisit[];
  totalPlanned: number;
  totalCompleted: number;
  notes: string;
}

function getPlannerPath() {
  return join(process.cwd(), "database", "planner.json");
}

function loadPlanner(): Planner[] {
  return JSON.parse(readFileSync(getPlannerPath(), "utf-8"));
}

function savePlanner(data: Planner[]): void {
  writeFileSync(getPlannerPath(), JSON.stringify(data, null, 2));
}

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
};

export default async (req: Request, context: Context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const url = new URL(req.url);

  try {
    if (req.method === "GET") {
      const planners = loadPlanner();
      const mrId = url.searchParams.get("mrId");
      const month = url.searchParams.get("month");

      let filtered = planners;
      if (mrId) filtered = filtered.filter((p) => p.mrId === mrId);
      if (month) filtered = filtered.filter((p) => p.month === month);

      return new Response(
        JSON.stringify({ success: true, data: filtered, total: filtered.length }),
        { status: 200, headers: corsHeaders }
      );
    }

    if (req.method === "POST") {
      const body = await req.json();
      const planners = loadPlanner();

      const monthNames = ["", "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
      const [year, mon] = (body.month || "").split("-");
      const monthName = `${monthNames[parseInt(mon)]} ${year}`;

      const existing = planners.find((p) => p.mrId === body.mrId && p.month === body.month);
      if (existing) {
        return new Response(
          JSON.stringify({ success: false, message: "Plan for this month already exists" }),
          { status: 409, headers: corsHeaders }
        );
      }

      const newPlan: Planner = {
        id: `pl${String(planners.length + 1).padStart(3, "0")}`,
        mrId: body.mrId,
        month: body.month,
        monthName,
        status: "Draft",
        approvedBy: null,
        submittedOn: null,
        approvedOn: null,
        plannedVisits: body.plannedVisits || [],
        totalPlanned: (body.plannedVisits || []).length,
        totalCompleted: 0,
        notes: body.notes || "",
      };

      planners.push(newPlan);
      savePlanner(planners);

      return new Response(
        JSON.stringify({ success: true, message: "Plan created", data: newPlan }),
        { status: 201, headers: corsHeaders }
      );
    }

    if (req.method === "PUT") {
      const body = await req.json();
      const { id, action, ...updates } = body;
      const planners = loadPlanner();
      const index = planners.findIndex((p) => p.id === id);

      if (index === -1) {
        return new Response(
          JSON.stringify({ success: false, message: "Plan not found" }),
          { status: 404, headers: corsHeaders }
        );
      }

      if (action === "submit") {
        planners[index].status = "Submitted";
        planners[index].submittedOn = new Date().toISOString().split("T")[0];
      } else if (action === "approve") {
        planners[index].status = "Approved";
        planners[index].approvedBy = updates.approvedBy || "admin";
        planners[index].approvedOn = new Date().toISOString().split("T")[0];
      } else {
        planners[index] = { ...planners[index], ...updates };
        planners[index].totalPlanned = planners[index].plannedVisits.length;
      }

      savePlanner(planners);

      return new Response(
        JSON.stringify({ success: true, message: "Plan updated", data: planners[index] }),
        { status: 200, headers: corsHeaders }
      );
    }

    return new Response(JSON.stringify({ success: false, message: "Method not allowed" }), {
      status: 405, headers: corsHeaders,
    });
  } catch (error) {
    console.error("Planner API error:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
};

export const config = {
  path: "/api/planner",
};
