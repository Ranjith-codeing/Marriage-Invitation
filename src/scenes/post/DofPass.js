import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { Vector2, Color } from 'three';

/**
 * The cinematic lens pass, in one shader (so it can read the scene's depth
 * without ever writing into the target that depth belongs to):
 *   • depth of field — golden-angle bokeh gather around the focus distance
 *   • god rays — bright sky pixels smeared toward the sun's on-screen
 *     position, so palms, pillars and drapes cut beams through the light
 * Either effect costs nothing when its strength is 0.
 */
const CinematicShader = {
  defines: { RAY_SAMPLES: 48 },
  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: null },
    cameraNear: { value: 0.1 },
    cameraFar: { value: 900 },
    focus: { value: 4 },
    strength: { value: 0 },
    texel: { value: new Vector2(1 / 1024, 1 / 1024) },
    sunPos: { value: new Vector2(0.5, 0.5) },
    raysStrength: { value: 0 },
    raysTint: { value: new Color(1, 0.85, 0.65) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    #include <packing>
    uniform sampler2D tDiffuse, tDepth;
    uniform float cameraNear, cameraFar, focus, strength, raysStrength;
    uniform vec2 texel, sunPos;
    uniform vec3 raysTint;
    varying vec2 vUv;

    const float MAX_BLUR = 11.0;   // pixels
    const float RAD_SCALE = 1.6;   // ring spacing (smaller = smoother, slower)
    const float GOLDEN = 2.39996323;

    float depthAt(vec2 uv) {
      return -perspectiveDepthToViewZ(texture2D(tDepth, uv).x, cameraNear, cameraFar);
    }
    float blurSize(float d) {
      float coc = clamp((1.0 / focus - 1.0 / d) * strength * 6.0, -1.0, 1.0);
      return abs(coc) * MAX_BLUR;
    }

    void main() {
      vec4 base = texture2D(tDiffuse, vUv);
      vec3 colour = base.rgb;

      if (strength > 0.001) {
        float centreDepth = depthAt(vUv);
        float centreSize = blurSize(centreDepth);
        float total = 1.0;
        float radius = RAD_SCALE;
        float ang = 0.0;
        for (int i = 0; i < 64; i++) {
          if (radius >= MAX_BLUR) break;
          vec2 uv = vUv + vec2(cos(ang), sin(ang)) * texel * radius;
          vec3 s = texture2D(tDiffuse, uv).rgb;
          float d = depthAt(uv);
          float size = blurSize(d);
          if (d > centreDepth) size = clamp(size, 0.0, centreSize * 2.0); // background can't bleed over a sharp foreground
          float m = smoothstep(radius - 0.5, radius + 0.5, size);
          colour += mix(colour / total, s, m);
          total += 1.0;
          radius += RAD_SCALE / radius;
          ang += GOLDEN;
        }
        colour /= total;
      }

      if (raysStrength > 0.001) {
        vec2 delta = (vUv - sunPos) / float(RAY_SAMPLES) * 0.9;
        vec2 uv = vUv;
        float illum = 0.0;
        float decay = 1.0;
        for (int i = 0; i < RAY_SAMPLES; i++) {
          uv -= delta;
          if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) break;
          float sky = step(0.99999, texture2D(tDepth, uv).x); // only the sky emits
          illum += sky * max(0.0, dot(texture2D(tDiffuse, uv).rgb, vec3(0.299, 0.587, 0.114)) - 0.55) * decay;
          decay *= 0.965;
        }
        colour += raysTint * illum / float(RAY_SAMPLES) * raysStrength * 6.0;
      }

      gl_FragColor = vec4(colour, base.a);
    }`,
};

export class DofPass extends ShaderPass {
  constructor(camera) {
    super(CinematicShader);
    this.camera = camera;
  }

  setSize(width, height) {
    this.uniforms.texel.value.set(1 / width, 1 / height);
  }

  render(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
    // Runs straight after the RenderPass: readBuffer holds this frame's colour and depth
    this.uniforms.tDepth.value = readBuffer.depthTexture;
    this.uniforms.cameraNear.value = this.camera.near;
    this.uniforms.cameraFar.value = this.camera.far;
    super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
  }
}
