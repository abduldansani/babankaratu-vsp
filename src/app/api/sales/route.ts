import { NextResponse } from "next/server";
import { getSales, createSale } from "@/actions/salesActions";

export async function GET() {
  try {
    const sales = await getSales();
    return NextResponse.json(sales);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch sales" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const newSale = await createSale(body);
    return NextResponse.json(newSale, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to record sale" },
      { status: 500 }
    );
  }
}
