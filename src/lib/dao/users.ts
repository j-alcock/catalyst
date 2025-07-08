import "server-only";

import { auth } from "@/auth";
import prisma from "@/lib/prisma/prisma";

import { redirect } from "next/navigation";
import { cache } from "react";

const unauthenticatedRedirect = "/login";

export async function getUserByEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  return user;
}

export const getUserIdFromSession = cache(async (): Promise<string> => {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return redirect(unauthenticatedRedirect);
  }

  return session.user.id;
});

export const getUserFromSession = cache(async () => {
  const session = await auth();

  if (!session) {
    return redirect(unauthenticatedRedirect);
  }

  const user = await prisma.user.findUnique({
    where: {
      email: session.user?.email || "",
    },
  });

  if (!user) {
    return redirect(unauthenticatedRedirect);
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    picture: user.picture,
  };
});

export async function saveUser(profile: {
  name: string;
  email: string;
  password?: string;
  picture: string;
}) {
  const user = await prisma.user.create({
    data: {
      name: profile.name,
      email: profile.email,
      password: profile.password,
      picture: profile.picture,
    },
  });

  return user;
}
