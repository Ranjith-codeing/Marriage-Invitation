/**
 * GPU wind. Injects a sway into any built-in material's vertex shader, applied
 * after instancing so neighbouring grass blades, fronds and garlands move as
 * one coherent breeze with travelling gusts. Costs nothing on the CPU.
 *
 * `factor` is a GLSL expression (0–1) for how much each vertex moves. It can use
 *   transformed — the vertex in the geometry's own space (before instancing)
 *   wOrigin     — the instance's / object's world-space origin
 */
export const wind = {
  time: { value: 0 },
  strength: { value: 1 },
};

let id = 0;

export function applyWind(material, { factor, amp = 0.1, freq = 1.6, key }) {
  const cacheKey = `wind-${key || id++}-${factor}-${amp}-${freq}`;
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous?.call(material, shader, renderer);
    shader.uniforms.uWindTime = wind.time;
    shader.uniforms.uWindStrength = wind.strength;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uWindTime;\nuniform float uWindStrength;')
      .replace(
        '#include <project_vertex>',
        /* glsl */ `
        #ifdef USE_INSTANCING
          vec3 wOrigin = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        #else
          vec3 wOrigin = modelMatrix[3].xyz;
        #endif
        vec4 mvPosition = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          mvPosition = instanceMatrix * mvPosition;
        #endif
        {
          float wAmt = clamp(${factor}, 0.0, 1.0);
          float phase = uWindTime * ${freq.toFixed(3)} - wOrigin.z * 0.18 + wOrigin.x * 0.07;
          float gust = 0.55 + 0.45 * sin(uWindTime * 0.31 - wOrigin.z * 0.045 + wOrigin.x * 0.02);
          float sway = sin(phase) * 0.7 + sin(phase * 2.3 + wOrigin.x) * 0.3;
          mvPosition.x += (sway + 0.35) * ${amp.toFixed(4)} * wAmt * gust * uWindStrength;
          mvPosition.z += cos(phase * 0.8 + 1.7) * ${(amp * 0.45).toFixed(4)} * wAmt * gust * uWindStrength;
        }
        mvPosition = modelViewMatrix * mvPosition;
        gl_Position = projectionMatrix * mvPosition;
        `
      );
  };
  material.customProgramCacheKey = () => cacheKey;
  return material;
}
