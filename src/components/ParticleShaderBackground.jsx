"use client";

import { useEffect, useRef } from "react";

const VERT_SRC = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAG_SRC = `
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;

void main() {
  vec2 px = gl_FragCoord.xy;
  vec2 uv = px / u_resolution;

  vec3 base = vec3(0.02, 0.022, 0.028);

  float scale = 40.0;
  vec2 cell = uv * scale;
  vec2 g = fract(cell) - 0.5;
  vec2 id = floor(cell);

  float ax = abs(g.x);
  float ay = abs(g.y);
  float line = smoothstep(0.035, 0.0, min(ax, ay));

  float t = u_time * 0.22;
  float pulse = 0.55 + 0.45 * sin(t + dot(id, vec2(0.41, 0.73)));
  float nodePulse = 0.5 + 0.5 * sin(t * 0.85 + dot(id, vec2(0.91, 0.37)));

  vec3 steel = vec3(0.36, 0.58, 0.72);
  vec3 steelDeep = vec3(0.16, 0.24, 0.32);
  vec3 glow = mix(steelDeep, steel, 0.5 + 0.5 * sin(t * 0.65));

  float crossGlow = smoothstep(0.11, 0.0, length(g) * 1.8);

  vec3 col = base;
  col += line * glow * 0.035 * pulse;
  col += crossGlow * glow * 0.065 * nodePulse;

  gl_FragColor = vec4(col, 1.0);
}
`;

/**
 * @param {WebGLRenderingContext} gl
 * @param {number} type
 * @param {string} src
 */
function compile(gl, type, src) {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

/**
 * @param {WebGLRenderingContext} gl
 */
function createProgram(gl) {
  const vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    gl.deleteProgram(prog);
    return null;
  }
  return prog;
}

/**
 * Full-screen WebGL fragment backdrop: slow grid + soft intersection pulses.
 * Fixed, behind page content (`z-index: -1`).
 */
export function ParticleShaderBackground() {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const startRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    });
    if (!gl) return;

    const program = createProgram(gl);
    if (!program) return;

    const locPos = gl.getAttribLocation(program, "a_position");
    const locRes = gl.getUniformLocation(program, "u_resolution");
    const locTime = gl.getUniformLocation(program, "u_time");

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );

    gl.useProgram(program);
    gl.enableVertexAttribArray(locPos);
    gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);

    const setSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(window.innerWidth * dpr);
      const h = Math.floor(window.innerHeight * dpr);
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      gl.viewport(0, 0, w, h);
    };

    setSize();
    startRef.current = performance.now();

    const draw = (timeSeconds) => {
      gl.uniform2f(locRes, canvas.width, canvas.height);
      gl.uniform1f(locTime, timeSeconds);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onResize = () => {
      setSize();
      if (reduced) {
        draw(0);
      }
    };
    window.addEventListener("resize", onResize);

    if (reduced) {
      draw(0);
      return () => {
        window.removeEventListener("resize", onResize);
        gl.deleteProgram(program);
        gl.deleteBuffer(buf);
      };
    }

    const frame = (now) => {
      const t = (now - startRef.current) * 0.001;
      draw(t);
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
      gl.deleteProgram(program);
      gl.deleteBuffer(buf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-[1] h-full w-full"
    />
  );
}
