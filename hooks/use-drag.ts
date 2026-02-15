import { useCallback, useEffect, useRef, useState } from "react";

export interface DragOptions {
	onDragStart?: (e: PointerEvent) => void;
	onDrag?: (delta: { x: number; y: number }, e: PointerEvent) => void;
	onDragEnd?: (e: PointerEvent) => void;
	axis?: "x" | "y" | "both"; // Constrain to axis
	snapToGrid?: number; // Snap to grid size
	bounds?: {
		// Constrain within bounds
		left?: number;
		right?: number;
		top?: number;
		bottom?: number;
	};
	disabled?: boolean;
}

export function useDrag(options: DragOptions = {}) {
	const {
		onDragStart,
		onDrag,
		onDragEnd,
		axis = "both",
		snapToGrid,
		bounds,
		disabled = false,
	} = options;

	const [isDragging, setIsDragging] = useState(false);
	const startPos = useRef({ x: 0, y: 0 });
	const currentPos = useRef({ x: 0, y: 0 });

	// Use refs to store latest callbacks to avoid stale closures
	const onDragStartRef = useRef(onDragStart);
	const onDragRef = useRef(onDrag);
	const onDragEndRef = useRef(onDragEnd);

	useEffect(() => {
		onDragStartRef.current = onDragStart;
		onDragRef.current = onDrag;
		onDragEndRef.current = onDragEnd;
	}, [onDragStart, onDrag, onDragEnd]);

	const handlePointerDown = useCallback(
		(e: React.PointerEvent) => {
			if (disabled) return;

			// Ignore right-clicks (button 2) to allow context menu
			if (e.button === 2) {
				return;
			}

			e.preventDefault();
			e.stopPropagation();

			const target = e.currentTarget as HTMLElement;
			target.setPointerCapture(e.pointerId);

			startPos.current = { x: e.clientX, y: e.clientY };
			currentPos.current = { x: e.clientX, y: e.clientY };
			setIsDragging(true);

			onDragStartRef.current?.(e.nativeEvent);
		},
		[disabled],
	);

	const handlePointerMove = useCallback(
		(e: React.PointerEvent) => {
			if (!isDragging) return;

			e.preventDefault();
			e.stopPropagation();

			let deltaX = e.clientX - currentPos.current.x;
			let deltaY = e.clientY - currentPos.current.y;

			// Apply axis constraints
			if (axis === "x") deltaY = 0;
			if (axis === "y") deltaX = 0;

			// Apply bounds
			if (bounds) {
				const newX = currentPos.current.x + deltaX;
				const newY = currentPos.current.y + deltaY;

				if (bounds.left !== undefined && newX < bounds.left) {
					deltaX = bounds.left - currentPos.current.x;
				}
				if (bounds.right !== undefined && newX > bounds.right) {
					deltaX = bounds.right - currentPos.current.x;
				}
				if (bounds.top !== undefined && newY < bounds.top) {
					deltaY = bounds.top - currentPos.current.y;
				}
				if (bounds.bottom !== undefined && newY > bounds.bottom) {
					deltaY = bounds.bottom - currentPos.current.y;
				}
			}

			// Apply snap to grid
			if (snapToGrid) {
				deltaX = Math.round(deltaX / snapToGrid) * snapToGrid;
				deltaY = Math.round(deltaY / snapToGrid) * snapToGrid;
			}

			currentPos.current = {
				x: currentPos.current.x + deltaX,
				y: currentPos.current.y + deltaY,
			};

			onDragRef.current?.({ x: deltaX, y: deltaY }, e.nativeEvent);
		},
		[isDragging, axis, bounds, snapToGrid],
	);

	const handlePointerUp = useCallback(
		(e: React.PointerEvent) => {
			if (!isDragging) return;

			e.preventDefault();
			e.stopPropagation();

			const target = e.currentTarget as HTMLElement;
			target.releasePointerCapture(e.pointerId);

			setIsDragging(false);
			onDragEndRef.current?.(e.nativeEvent);
		},
		[isDragging],
	);

	return {
		isDragging,
		dragHandlers: {
			onPointerDown: handlePointerDown,
			onPointerMove: handlePointerMove,
			onPointerUp: handlePointerUp,
		},
	};
}
