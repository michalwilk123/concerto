import "./globals.css";
import "@livekit/components-styles";
import { ToastProvider } from "@/components/Toast";

export const metadata = {
	title: "Concerto",
	description: "Collaborative music education platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body>
				<ToastProvider>{children}</ToastProvider>
				<div id="portal-root" />
			</body>
		</html>
	);
}
