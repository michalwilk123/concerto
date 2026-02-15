export interface PreviewerProps {
	fileUrl: string;
	fileName: string;
	mimeType: string;
}

export type PreviewerComponent = React.ComponentType<PreviewerProps>;
