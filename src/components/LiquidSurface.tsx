import { useEffect, useRef } from 'react'
import type { AtmosphereVariant } from '../lib/atmosphere'

type Palette = {
  deep: [number, number, number]
  mid: [number, number, number]
  accent: [number, number, number]
  glow: [number, number, number]
  speed: number
  energy: number
}

type SceneInput = {
  readonly variant: AtmosphereVariant
  readonly night: boolean
  readonly light: boolean
}

const DARK: Record<AtmosphereVariant, Palette> = {
  clear: {
    deep: [0.002, 0.014, 0.048],
    mid: [0.016, 0.145, 0.34],
    accent: [0.18, 0.78, 1.0],
    glow: [1.0, 0.66, 0.26],
    speed: 0.075,
    energy: 1.0,
  },
  partly: {
    deep: [0.004, 0.014, 0.038],
    mid: [0.045, 0.11, 0.19],
    accent: [0.4, 0.65, 0.82],
    glow: [0.97, 0.79, 0.52],
    speed: 0.065,
    energy: 1.1,
  },
  cloudy: {
    deep: [0.003, 0.009, 0.024],
    mid: [0.035, 0.07, 0.11],
    accent: [0.32, 0.47, 0.58],
    glow: [0.55, 0.66, 0.76],
    speed: 0.05,
    energy: 1.25,
  },
  rain: {
    deep: [0.002, 0.014, 0.032],
    mid: [0.02, 0.105, 0.18],
    accent: [0.18, 0.57, 0.74],
    glow: [0.42, 0.73, 0.88],
    speed: 0.14,
    energy: 1.35,
  },
  storm: {
    deep: [0.001, 0.003, 0.016],
    mid: [0.022, 0.032, 0.095],
    accent: [0.27, 0.37, 0.76],
    glow: [0.47, 0.54, 0.86],
    speed: 0.19,
    energy: 1.85,
  },
  snow: {
    deep: [0.008, 0.024, 0.05],
    mid: [0.075, 0.15, 0.22],
    accent: [0.6, 0.85, 0.95],
    glow: [0.86, 0.95, 1.0],
    speed: 0.04,
    energy: 0.75,
  },
  fog: {
    deep: [0.008, 0.015, 0.024],
    mid: [0.1, 0.13, 0.15],
    accent: [0.44, 0.53, 0.57],
    glow: [0.68, 0.72, 0.73],
    speed: 0.028,
    energy: 0.6,
  },
  wind: {
    deep: [0.004, 0.014, 0.03],
    mid: [0.04, 0.12, 0.18],
    accent: [0.46, 0.72, 0.82],
    glow: [0.7, 0.86, 0.91],
    speed: 0.17,
    energy: 1.5,
  },
  ambient: {
    deep: [0.005, 0.012, 0.03],
    mid: [0.035, 0.08, 0.14],
    accent: [0.35, 0.57, 0.82],
    glow: [0.52, 0.72, 0.92],
    speed: 0.045,
    energy: 0.9,
  },
}

const LIGHT: Record<AtmosphereVariant, Palette> = {
  clear: {
    deep: [0.69, 0.82, 0.91],
    mid: [0.93, 0.97, 1.0],
    accent: [0.3, 0.74, 0.88],
    glow: [1.0, 0.89, 0.68],
    speed: 0.055,
    energy: 1.0,
  },
  partly: {
    deep: [0.72, 0.79, 0.86],
    mid: [0.94, 0.96, 0.98],
    accent: [0.47, 0.7, 0.82],
    glow: [1.0, 0.91, 0.73],
    speed: 0.045,
    energy: 1.1,
  },
  cloudy: {
    deep: [0.7, 0.74, 0.79],
    mid: [0.91, 0.93, 0.95],
    accent: [0.45, 0.57, 0.64],
    glow: [0.96, 0.96, 0.97],
    speed: 0.04,
    energy: 1.2,
  },
  rain: {
    deep: [0.61, 0.71, 0.78],
    mid: [0.85, 0.9, 0.94],
    accent: [0.23, 0.56, 0.69],
    glow: [0.76, 0.9, 0.97],
    speed: 0.1,
    energy: 1.35,
  },
  storm: {
    deep: [0.53, 0.58, 0.67],
    mid: [0.79, 0.82, 0.87],
    accent: [0.31, 0.38, 0.62],
    glow: [0.68, 0.71, 0.84],
    speed: 0.14,
    energy: 1.7,
  },
  snow: {
    deep: [0.74, 0.83, 0.89],
    mid: [0.96, 0.985, 1.0],
    accent: [0.43, 0.69, 0.79],
    glow: [1.0, 1.0, 1.0],
    speed: 0.03,
    energy: 0.75,
  },
  fog: {
    deep: [0.7, 0.74, 0.76],
    mid: [0.9, 0.92, 0.93],
    accent: [0.46, 0.56, 0.59],
    glow: [0.97, 0.97, 0.95],
    speed: 0.024,
    energy: 0.6,
  },
  wind: {
    deep: [0.68, 0.8, 0.86],
    mid: [0.92, 0.96, 0.98],
    accent: [0.38, 0.68, 0.8],
    glow: [0.9, 0.97, 1.0],
    speed: 0.13,
    energy: 1.5,
  },
  ambient: {
    deep: [0.69, 0.78, 0.86],
    mid: [0.92, 0.95, 0.98],
    accent: [0.4, 0.64, 0.8],
    glow: [0.85, 0.92, 0.98],
    speed: 0.035,
    energy: 0.9,
  },
}

const NIGHT: Palette = {
  deep: [0.001, 0.005, 0.026],
  mid: [0.012, 0.058, 0.17],
  accent: [0.1, 0.53, 0.98],
  glow: [0.36, 0.78, 1.0],
  speed: 0.06,
  energy: 0.9,
}

const NIGHT_LIGHT: Palette = {
  deep: [0.66, 0.75, 0.87],
  mid: [0.91, 0.94, 0.99],
  accent: [0.34, 0.48, 0.74],
  glow: [0.84, 0.89, 1.0],
  speed: 0.04,
  energy: 0.85,
}

function paletteFor({ variant, night, light }: SceneInput): Palette {
  const isNight = night && (variant === 'clear' || variant === 'partly')
  if (light) return isNight ? NIGHT_LIGHT : LIGHT[variant]
  return isNight ? NIGHT : DARK[variant]
}

const VERTEX_SHADER = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

const FRAGMENT_SHADER = `
precision mediump float;

uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uDeep;
uniform vec3 uMid;
uniform vec3 uAccent;
uniform vec3 uGlow;
uniform float uEnergy;
uniform float uFlash;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p = p * 2.03 + vec2(11.7, 7.3);
    amplitude *= 0.5;
  }
  return value;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0) * 2.45;

  float t = uTime;
  vec2 flow = vec2(0.0, t * 0.045);

  vec2 q = vec2(
    fbm(p * 1.08 + flow + vec2(0.0, 1.4)),
    fbm(p * 1.08 + flow + vec2(4.2, -1.1))
  );

  vec2 r = vec2(
    fbm(p * 1.85 + q * (1.5 + uEnergy * 0.42) + vec2(2.4, 7.1) + t * 0.032),
    fbm(p * 1.85 + q * (1.5 + uEnergy * 0.42) + vec2(8.7, 1.3) - t * 0.026)
  );

  float field = fbm(p * 1.32 + r * 2.1);
  float depth = smoothstep(0.16, 0.84, field);

  vec3 colour = mix(uDeep, uMid, depth);

  float band = smoothstep(0.43, 0.495, field) * (1.0 - smoothstep(0.515, 0.58, field));
  colour += uAccent * band * 0.14;

  float filament = pow(clamp(1.0 - abs(field - 0.515) * 3.4, 0.0, 1.0), 7.0);
  colour += uAccent * filament * 0.26;

  float bloom = exp(-length(uv - vec2(0.76, 0.1)) * 3.4);
  colour += uGlow * bloom * 0.05;

  float underglow = exp(-length(uv - vec2(0.16, 0.94)) * 3.6);
  colour += uAccent * underglow * 0.06;

  colour *= mix(0.7, 1.06, smoothstep(0.0, 0.92, uv.y));

  float vignette = smoothstep(1.0, 0.28, length((uv - 0.5) * vec2(1.04, 1.0)));
  colour *= mix(0.58, 1.0, vignette);

  colour += uFlash * vec3(0.42, 0.57, 0.9);

  gl_FragColor = vec4(colour, 1.0);
}
`

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

type Props = {
  readonly variant: AtmosphereVariant
  readonly night: boolean
}

/**
 * Full-screen liquid field. A tiny WebGL fragment shader warps value noise
 * through two feedback fields, producing slow marbled surfaces and caustic
 * filaments. Rendering is capped at ~30 fps and a fractional pixel ratio so it
 * stays cheap on mobile. If WebGL is unavailable the CSS gradient behind the
 * canvas remains as the fallback; prefers-reduced-motion freezes the field.
 */
export default function LiquidSurface({ variant, night }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<SceneInput>({ variant, night, light: false })
  const dirtyRef = useRef(true)

  useEffect(() => {
    // The animation loop cross-fades to the new palette; drawing here would
    // snap the scene instead of letting it flow into the next condition.
    sceneRef.current = { ...sceneRef.current, variant, night }
    dirtyRef.current = true
  }, [variant, night])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let gl: WebGLRenderingContext | null = null
    try {
      gl = canvas.getContext('webgl', {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: 'low-power',
        preserveDrawingBuffer: false,
      })
    } catch {
      gl = null
    }
    if (!gl) return

    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
    if (!vertex || !fragment) return

    const program = gl.createProgram()
    if (!program) return
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    )
    const position = gl.getAttribLocation(program, 'aPosition')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

    const uniforms = {
      resolution: gl.getUniformLocation(program, 'uResolution'),
      time: gl.getUniformLocation(program, 'uTime'),
      deep: gl.getUniformLocation(program, 'uDeep'),
      mid: gl.getUniformLocation(program, 'uMid'),
      accent: gl.getUniformLocation(program, 'uAccent'),
      glow: gl.getUniformLocation(program, 'uGlow'),
      energy: gl.getUniformLocation(program, 'uEnergy'),
      flash: gl.getUniformLocation(program, 'uFlash'),
    }

    const media = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: light)')
      : null
    const motion = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null
    let reduced = motion?.matches ?? false
    sceneRef.current = { ...sceneRef.current, light: media?.matches ?? false }

    const initial = paletteFor(sceneRef.current)
    const current: Palette = {
      deep: [...initial.deep],
      mid: [...initial.mid],
      accent: [...initial.accent],
      glow: [...initial.glow],
      speed: initial.speed,
      energy: initial.energy,
    }

    const sizeCanvas = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.6)
      const density = window.innerWidth < 768 ? 0.62 : 0.72
      let width = Math.max(1, Math.round(window.innerWidth * pixelRatio * density))
      const height = Math.max(
        1,
        Math.round((width * window.innerHeight) / Math.max(window.innerWidth, 1)),
      )
      if (width > 1600) {
        const scale = 1600 / width
        width = 1600
        gl!.viewport(0, 0, width, Math.round(height * scale))
        canvas.width = width
        canvas.height = Math.round(height * scale)
      } else if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
        gl!.viewport(0, 0, width, height)
      }
      if (uniforms.resolution) gl!.uniform2f(uniforms.resolution, canvas.width, canvas.height)
    }

    sizeCanvas()

    const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount
    const lerpPalette = (target: Palette, amount: number) => {
      current.deep = [
        lerp(current.deep[0], target.deep[0], amount),
        lerp(current.deep[1], target.deep[1], amount),
        lerp(current.deep[2], target.deep[2], amount),
      ]
      current.mid = [
        lerp(current.mid[0], target.mid[0], amount),
        lerp(current.mid[1], target.mid[1], amount),
        lerp(current.mid[2], target.mid[2], amount),
      ]
      current.accent = [
        lerp(current.accent[0], target.accent[0], amount),
        lerp(current.accent[1], target.accent[1], amount),
        lerp(current.accent[2], target.accent[2], amount),
      ]
      current.glow = [
        lerp(current.glow[0], target.glow[0], amount),
        lerp(current.glow[1], target.glow[1], amount),
        lerp(current.glow[2], target.glow[2], amount),
      ]
      current.speed = lerp(current.speed, target.speed, amount)
      current.energy = lerp(current.energy, target.energy, amount)
    }

    // Palette speeds are authored as calm, cinematic rates. Scale time so the
    // surface visibly flows within a breath instead of only across minutes.
    const motionScale = 4.5
    let elapsed = 0
    let last = performance.now()
    let lastDraw = 0
    let frame = 0
    let running = true

    const render = (time: number) => {
      const flash = sceneRef.current.variant === 'storm' && !reduced
        ? (() => {
            const cycle = (time / 1000 + 1.7) % 9.4
            if (cycle > 8.4 && cycle < 8.47) return 0.72
            if (cycle > 8.53 && cycle < 8.59) return 0.34
            return 0
          })()
        : 0

      gl!.uniform1f(uniforms.time!, time / 1000)
      gl!.uniform3fv(uniforms.deep!, current.deep as unknown as Float32List)
      gl!.uniform3fv(uniforms.mid!, current.mid as unknown as Float32List)
      gl!.uniform3fv(uniforms.accent!, current.accent as unknown as Float32List)
      gl!.uniform3fv(uniforms.glow!, current.glow as unknown as Float32List)
      gl!.uniform1f(uniforms.energy!, current.energy)
      gl!.uniform1f(uniforms.flash!, flash)
      gl!.drawArrays(gl!.TRIANGLES, 0, 3)
    }

    const drawOnce = () => {
      if (!gl) return
      const target = paletteFor(sceneRef.current)
      current.deep = [...target.deep]
      current.mid = [...target.mid]
      current.accent = [...target.accent]
      current.glow = [...target.glow]
      current.energy = target.energy
      current.speed = target.speed
      render(reduced ? 400 : performance.now())
      dirtyRef.current = false
    }
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      if (!running) return
      if (now - lastDraw < 1000 / 30) return
      const delta = Math.min((now - last) / 1000, 0.12)
      last = now
      lastDraw = now

      if (document.hidden) return

      if (reduced) {
        if (dirtyRef.current) drawOnce()
        return
      }

      elapsed += delta * current.speed * motionScale
      lerpPalette(paletteFor(sceneRef.current), 1 - Math.exp(-delta * 1.5))
      render(elapsed * 1000)
      dirtyRef.current = false
    }

    const onVisibility = () => {
      last = performance.now()
      lastDraw = 0
    }
    const onResize = () => {
      sizeCanvas()
      dirtyRef.current = true
    }
    const onMotionChange = (event: MediaQueryListEvent) => {
      reduced = event.matches
      dirtyRef.current = true
    }
    const onLightChange = (event: MediaQueryListEvent) => {
      sceneRef.current = { ...sceneRef.current, light: event.matches }
      dirtyRef.current = true
    }

    if (media) media.addEventListener('change', onLightChange)
    if (motion) motion.addEventListener('change', onMotionChange)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('resize', onResize)

    drawOnce()
    frame = requestAnimationFrame(tick)

    return () => {
      running = false
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
      media?.removeEventListener('change', onLightChange)
      motion?.removeEventListener('change', onMotionChange)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      gl.deleteShader(vertex)
      gl.deleteShader(fragment)
    }
  }, [])

  return <canvas className="atmosphere__liquid" ref={canvasRef} aria-hidden="true" />
}
