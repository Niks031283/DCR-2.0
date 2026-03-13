import type { Context } from "@netlify/functions";
import { readFileSync } from "fs";
import { join } from "path";

interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  territory: string;
  headquarter: string;
  division: string;
  avatar: string;
}

export default async (req: Request, context: Context) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ success: false, message: "Method not allowed" }), {
      status: 405, headers,
    });
  }

  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return new Response(JSON.stringify({ success: false, message: "Email and password required" }), {
        status: 400, headers,
      });
    }

    const usersPath = join(process.cwd(), "database", "users.json");
    const usersData = readFileSync(usersPath, "utf-8");
    const users: User[] = JSON.parse(usersData);

    const user = users.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (!user) {
      return new Response(JSON.stringify({ success: false, message: "Invalid email or password" }), {
        status: 401, headers,
      });
    }

    const token = Buffer.from(`${user.id}:${user.email}:${Date.now()}`).toString("base64");

    const { password: _pwd, ...safeUser } = user;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Login successful",
        token,
        user: safeUser,
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error("Login error:", error);
    return new Response(JSON.stringify({ success: false, message: "Internal server error" }), {
      status: 500, headers,
    });
  }
};

export const config = {
  path: "/api/login",
};
