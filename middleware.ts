import { type NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
	const sessionCookie =
		request.cookies.get("better-auth.session_token") ||
		request.cookies.get("__Secure-better-auth.session_token");
	const { pathname } = request.nextUrl;

	// Redirect authenticated users away from auth pages
	if (sessionCookie && (pathname === "/login" || pathname === "/register")) {
		return NextResponse.redirect(new URL("/dashboard", request.url));
	}

	// Redirect unauthenticated users from dashboard to login (files require auth)
	if (!sessionCookie && pathname === "/dashboard") {
		return NextResponse.redirect(new URL("/login", request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/login", "/register", "/dashboard"],
};
