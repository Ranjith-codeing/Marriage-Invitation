import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { Vector2 } from 'three';

/**
 * Single-pass cinematic depth of field (golden-angle bokeh gather).
 * Reads the depth texture of the frame the RenderPass just drew, so cut-out
 * and alpha-tested objects keep correct edges. `strength` 0 = pass-through.
 */
const DofShader = {
  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: null },
    cameraNear: { value: 0.1 },
    cameraFar: { value: 900 },
    focus: { value: 4 },
    strength: { value: 0 },
    texel: { value: new Vector2(1 / 1024, 1 / 1024) },
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
    uniform float cameraNear, cameraFar, focus, strength;
    uniform vec2 texel;
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
      if (strength <= 0.001) { gl_FragColor = base; return; }
      float centreDepth = depthAt(vUv);
      float centreSize = blurSize(centreDepth);
      vec3 colour = base.rgb;
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
      gl_FragColor = vec4(colour / total, base.a);
    }`,
};

export class DofPass extends ShaderPass {
  constructor(camera) {
    super(DofShader);
    this.camera = camera;
  }

  setSize(width, height) {
    this.uniforms.texel.value.set(1 / width, 1 / height);
  }

  render(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
    this.uniforms.tDepth.value = readBuffer.depthTexture;
    this.uniforms.cameraNear.value = this.camera.near;
    this.uniforms.cameraFar.value = this.camera.far;
    super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
  }
}
