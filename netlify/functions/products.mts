import type { Context } from "@netlify/functions";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

interface Product {
  id: string;
  name: string;
  genericName: string;
  category: string;
  division: string;
  mrp: number;
  packing: string;
  description: string;
  indications: string[];
  keyBenefits: string[];
  sampleAvailable: boolean;
  active: boolean;
  launchDate: string;
  stockUnits: number;
}

function loadProducts(): Product[] {
  const path = join(process.cwd(), "database", "products.json");
  return JSON.parse(readFileSync(path, "utf-8"));
}

function saveProducts(products: Product[]): void {
  const path = join(process.cwd(), "database", "products.json");
  writeFileSync(path, JSON.stringify(products, null, 2), "utf-8");
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
    if (req.method === "GET") {
      const products = loadProducts();
      const division = url.searchParams.get("division");
      const category = url.searchParams.get("category");
      const search = url.searchParams.get("search");

      let filtered = products.filter((p) => p.active);
      if (division) filtered = filtered.filter((p) => p.division.toLowerCase() === division.toLowerCase());
      if (category) filtered = filtered.filter((p) => p.category.toLowerCase() === category.toLowerCase());
      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(
          (p) =>
            p.name.toLowerCase().includes(s) ||
            p.genericName.toLowerCase().includes(s) ||
            p.category.toLowerCase().includes(s)
        );
      }

      return new Response(
        JSON.stringify({ success: true, data: filtered, total: filtered.length }),
        { status: 200, headers: corsHeaders }
      );
    }

    if (req.method === "POST") {
      const body = await req.json();
      const products = loadProducts();

      const newProduct: Product = {
        id: `p${String(products.length + 1).padStart(3, "0")}`,
        name: body.name,
        genericName: body.genericName || "",
        category: body.category || "",
        division: body.division || "",
        mrp: parseFloat(body.mrp) || 0,
        packing: body.packing || "",
        description: body.description || "",
        indications: body.indications || [],
        keyBenefits: body.keyBenefits || [],
        sampleAvailable: body.sampleAvailable || false,
        active: true,
        launchDate: body.launchDate || new Date().toISOString().split("T")[0],
        stockUnits: parseInt(body.stockUnits) || 0,
      };

      if (!newProduct.name) {
        return new Response(
          JSON.stringify({ success: false, message: "Product name is required" }),
          { status: 400, headers: corsHeaders }
        );
      }

      products.push(newProduct);
      saveProducts(products);

      return new Response(
        JSON.stringify({ success: true, message: "Product added successfully", data: newProduct }),
        { status: 201, headers: corsHeaders }
      );
    }

    if (req.method === "PUT") {
      const body = await req.json();
      const { id, ...updates } = body;
      const products = loadProducts();
      const index = products.findIndex((p) => p.id === id);

      if (index === -1) {
        return new Response(
          JSON.stringify({ success: false, message: "Product not found" }),
          { status: 404, headers: corsHeaders }
        );
      }

      products[index] = { ...products[index], ...updates };
      saveProducts(products);

      return new Response(
        JSON.stringify({ success: true, message: "Product updated", data: products[index] }),
        { status: 200, headers: corsHeaders }
      );
    }

    return new Response(JSON.stringify({ success: false, message: "Method not allowed" }), {
      status: 405, headers: corsHeaders,
    });
  } catch (error) {
    console.error("Products API error:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
};

export const config = {
  path: "/api/products",
};
