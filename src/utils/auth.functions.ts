import { createServerFn } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import bcrypt from "bcryptjs";
import { db } from "./db.server";
import { usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  createToken,
  setAuthCookie,
  deleteAuthCookie,
  getCurrentUserFromCookie,
  type JWTPayload,
} from "./jwt.server";
import { z } from "zod";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  password: z.string().min(6),
});

export interface AuthSuccessResult {
  success: true;
  user: {
    userId: string;
    email: string;
    name: string;
  };
}

export interface AuthErrorResult {
  success: false;
  error: { message: string };
}

export type AuthResult = AuthSuccessResult | AuthErrorResult;

export const loginFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const result = loginSchema.safeParse(data);
    if (!result.success) {
      return { success: false, error: "Invalid email or password format" };
    }
    return { success: true, data: result.data };
  })
  .handler(async ({ data }): Promise<AuthResult | never> => {
    if (!data.success) {
      return { success: false, error: { message: data.error! } };
    }

    try {
      const user = await db
        .select({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
          password: usersTable.password,
        })
        .from(usersTable)
        .where(eq(usersTable.email, data.data!.email))
        .limit(1);

      if (user.length === 0) {
        return {
          success: false,
          error: { message: "Invalid email or password" },
        };
      }

      const isValidPassword = await bcrypt.compare(
        data.data!.password,
        user[0].password,
      );

      if (!isValidPassword) {
        return {
          success: false,
          error: { message: "Invalid email or password" },
        };
      }

      const payload: JWTPayload = {
        userId: user[0].id,
        email: user[0].email,
        name: user[0].name,
      };

      const token = createToken(payload);
      setAuthCookie(token);

      // Return success before redirect
      return {
        success: true,
        user: payload,
      };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? { message: error.message }
            : { message: "Login failed" },
      };
    }
  });

export const registerFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const result = registerSchema.safeParse(data);
    if (!result.success) {
      return { success: false, error: "Invalid input data" };
    }
    return { success: true, data: result.data };
  })
  .handler(async ({ data }): Promise<AuthResult | never> => {
    if (!data.success) {
      return { success: false, error: { message: data.error! } };
    }

    try {
      const existingUser = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.email, data.data!.email))
        .limit(1);

      if (existingUser.length > 0) {
        return {
          success: false,
          error: { message: "User with this email already exists" },
        };
      }

      const hashedPassword = await bcrypt.hash(data.data!.password, 12);

      const [newUser] = await db
        .insert(usersTable)
        .values({
          name: data.data!.name,
          email: data.data!.email,
          password: hashedPassword,
        })
        .returning({
          id: usersTable.id,
          name: usersTable.name,
          email: usersTable.email,
        });

      const payload: JWTPayload = {
        userId: newUser.id,
        email: newUser.email,
        name: newUser.name,
      };

      const token = createToken(payload);
      setAuthCookie(token);

      // Return success before redirect
      return {
        success: true,
        user: payload,
      };
    } catch (error) {
      console.error("Registration error:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? { message: error.message }
            : { message: "Registration failed" },
      };
    }
  });

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  deleteAuthCookie();
  throw redirect({ to: "/login" });
});

export const getCurrentUserFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const user = getCurrentUserFromCookie();
    return user;
  },
);

export const requireAuthFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const user = getCurrentUserFromCookie();
    if (!user) {
      throw redirect({ to: "/login", search: { redirect: "/workspace" } });
    }
    return user;
  },
);
