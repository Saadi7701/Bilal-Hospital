import { NextResponse } from "next/server";
import { userRepository } from "@/repositories/UserRepository";
import { roleToPortal } from "@/lib/authSession";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const debug = searchParams.get("debug") === "1" || searchParams.get("debug") === "true";

    if (debug) {
      let dbStatus = "connected";
      let dbError: string | null = null;
      let count = 0;
      try {
        count = await prisma.user.count();
      } catch (e: any) {
        dbStatus = "error";
        dbError = e?.message || String(e);
      }
      return NextResponse.json({
        status: "debug_ok",
        route: "/api/users",
        dbStatus,
        dbError,
        userCount: count,
        timestamp: new Date().toISOString(),
      });
    }

    const users = await userRepository.findAll();

    const formattedUsers = users.map((u) => ({
      id: u._id.toString(),
      username: u.username,
      email: u.email,
      fullName: u.fullName,
      role: u.role,
      portal: roleToPortal(u.role),
      isActive: u.isActive,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    }));

    return NextResponse.json({ users: formattedUsers }, { status: 200 });
  } catch (error: any) {
    console.error("[Users API Error] Failed to fetch users:", error);
    return NextResponse.json(
      {
        error: `Failed to fetch users from database: ${error?.message || String(error)}`,
        details: error?.stack || error?.message || String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, email, password, fullName, role } = body;

    if (!username || !email || !password || !fullName || !role) {
      return NextResponse.json(
        { error: "Username, email, password, fullName, and role are required." },
        { status: 400 }
      );
    }

    const existingUser = await userRepository.findByUsername(username);
    if (existingUser) {
      return NextResponse.json(
        { error: `Username '${username}' is already taken.` },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await userRepository.createUser({
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      fullName: fullName.trim(),
      role,
      isActive: true,
    });

    return NextResponse.json(
      {
        message: "User created successfully",
        user: {
          id: newUser._id.toString(),
          username: newUser.username,
          email: newUser.email,
          fullName: newUser.fullName,
          role: newUser.role,
          portal: roleToPortal(newUser.role),
          isActive: newUser.isActive,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Users API Error] Failed to create user:", error);
    return NextResponse.json(
      {
        error: `Failed to create user in database: ${error?.message || String(error)}`,
        details: error?.stack || error?.message || String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

