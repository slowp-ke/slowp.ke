"use client";

import { effect, useComputed, useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";

import "./slowpoke.css";

const WIDTH = 24;
const HEIGHT = 32;
const SPEED = 80;
const TICK = 1000 / 60;
const OCTANT = Math.PI / 4;
const IDLE = [40, 8, 8, 8];
const WALK = [8, 10, 8, 10];
const KEYS: Record<string, readonly [number, number]> = {
	ArrowDown: [0, 1],
	ArrowLeft: [-1, 0],
	ArrowRight: [1, 0],
	ArrowUp: [0, -1],
	KeyA: [-1, 0],
	KeyD: [1, 0],
	KeyS: [0, 1],
	KeyW: [0, -1],
};

const clamp = (value: number, size: number, viewport: number) => {
	const max = (viewport - size) / 2;
	return Math.min(max, Math.max(-max, value));
};

const Slowpoke = () => {
	const ref = useRef<HTMLDivElement>(null);
	const x = useSignal(0);
	const y = useSignal(0);
	const direction = useSignal(0);
	const frame = useSignal(0);
	const walking = useSignal(false);
	const className = useComputed(() => (walking.value ? "slowpoke walking" : "slowpoke"));
	const style = useComputed(
		() =>
			`background-position:${frame.value * -WIDTH}px ${direction.value * -HEIGHT}px;translate:${Math.round(x.value)}px ${Math.round(y.value)}px`,
	);

	useEffect(() => {
		const controller = new AbortController();
		const { signal } = controller;
		const { height, width } = ref.current!.getBoundingClientRect();
		const held = new Set<string>();
		let dx = 0;
		let dy = 0;
		let remaining = 0;

		const walk = (h: number, v: number, distance = Infinity) => {
			const length = Math.hypot(h, v);
			if (length) {
				dx = h / length;
				dy = v / length;
				remaining = distance;
				direction.value = (10 - Math.round(Math.atan2(v, h) / OCTANT)) % 8;
			}
			walking.value = length > 0;
		};

		const steer = () => {
			let h = 0;
			let v = 0;
			for (const code of held) {
				h += KEYS[code][0];
				v += KEYS[code][1];
			}
			walk(Math.sign(h), Math.sign(v));
		};

		const release = () => {
			if (held.size) {
				held.clear();
				steer();
			}
		};

		const onKey = ({ altKey, code, ctrlKey, metaKey, repeat, type }: KeyboardEvent) => {
			if (altKey || ctrlKey || metaKey) {
				release();
				return;
			}
			if (repeat || !Object.hasOwn(KEYS, code)) {
				return;
			}
			if (type === "keydown") {
				held.add(code);
			} else if (!held.delete(code)) {
				return;
			}
			steer();
		};

		const onPointer = ({ button, clientX, clientY }: PointerEvent) => {
			if (button !== 0) {
				return;
			}
			held.clear();
			const h = clamp(clientX - innerWidth / 2, width, innerWidth) - x.value;
			const v = clamp(clientY - innerHeight / 2, height, innerHeight) - y.value;
			walk(h, v, Math.hypot(h, v));
		};

		addEventListener("keydown", onKey, { signal });
		addEventListener("keyup", onKey, { signal });
		addEventListener("pointerdown", onPointer, { signal });
		addEventListener("blur", release, { signal });

		const animate = effect(() => {
			const durations = walking.value ? WALK : IDLE;
			let timeout = 0;
			const show = (index: number) => {
				frame.value = index;
				timeout = setTimeout(show, durations[index] * TICK, (index + 1) % durations.length);
			};
			show(0);
			return () => clearTimeout(timeout);
		});

		const move = effect(() => {
			if (!walking.value) {
				return;
			}
			let last: number | undefined;
			let request = 0;
			const step = (now: number) => {
				const distance = Math.min(remaining, (SPEED * (now - (last ?? now))) / 1000);
				x.value = clamp(x.value + dx * distance, width, innerWidth);
				y.value = clamp(y.value + dy * distance, height, innerHeight);
				remaining -= distance;
				if (remaining > 0) {
					last = now;
					request = requestAnimationFrame(step);
				} else {
					walking.value = false;
				}
			};
			request = requestAnimationFrame(step);
			return () => cancelAnimationFrame(request);
		});

		return () => {
			controller.abort();
			animate();
			move();
		};
	}, []);

	return <div aria-label="Slowpoke" class={className} ref={ref} role="img" style={style} />;
};
export default Slowpoke;
