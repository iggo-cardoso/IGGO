// Original, reusable WebGL reveal for raster logos.
const vertex = `#version 300 es
in vec2 position; out vec2 uv;
void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}`;
const fragment = `#version 300 es
precision highp float;
in vec2 uv; out vec4 color;
uniform sampler2D image; uniform float progress; uniform float aspect;
void main(){
 vec2 p=uv-.5; p.x*=aspect;
 float r=length(p), t=progress, fade=1.-smoothstep(.58,.96,t);
 vec2 direction=p/max(r,.001);
 float wave=sin(r*39.-t*18.+sin(atan(p.y,p.x)*3.)*.8);
 vec2 sampleAt=uv+direction*wave*exp(-r*5.)*.055*fade;
 sampleAt.x+=sin(uv.y*22.+t*10.)*.012*fade;
 sampleAt.y+=sin(uv.x*17.-t*12.)*.008*fade;
 vec4 mark=texture(image,clamp(sampleAt,vec2(0.),vec2(1.)));
 float arrive=smoothstep(.06,.66,t+(uv.x-.5)*.13);
 float ring=exp(-pow((r-(t*.9-.1))*22.,2.))*fade;
 vec3 rgb=mix(vec3(.7,.79,.85),mark.rgb,smoothstep(.14,.7,t));
 color=vec4(mix(rgb,vec3(1.),ring*.35*mark.a),clamp(mark.a*arrive+ring*.1,0.,1.));
}`;

function shader(gl, type, source) {
  const value = gl.createShader(type);
  gl.shaderSource(value, source);
  gl.compileShader(value);
  if (!gl.getShaderParameter(value, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(value));
  return value;
}

export function LiquidGlassLogo({ logo, ending = 'logo', theme = 'light', duration = 3000, style = {} } = {}) {
  const root = document.createElement('div');
  root.className = `liquid-glass-logo liquid-glass-logo--${theme}`;
  root.dataset.ending = ending;
  root.style.height = typeof style.height === 'number' ? `${style.height}px` : (style.height || '480px');
  const canvas = document.createElement('canvas');
  canvas.className = 'liquid-glass-logo__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const image = document.createElement('img');
  image.className = 'liquid-glass-logo__fallback';
  image.src = logo;
  image.alt = '';
  root.append(canvas, image);
  let gl, program, texture, buffer, vs, fs, frame = 0, disposed = false;
  root.finished = image.decode().then(() => {
    if (disposed || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    try {
      gl = canvas.getContext('webgl2', { alpha: true });
      if (!gl) return;
      vs = shader(gl, gl.VERTEX_SHADER, vertex);
      fs = shader(gl, gl.FRAGMENT_SHADER, fragment);
      program = gl.createProgram();
      gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
      gl.useProgram(program);
      buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'position');
      gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      texture = gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      for (const key of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_2D, key, gl.LINEAR);
      for (const key of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T]) gl.texParameteri(gl.TEXTURE_2D, key, gl.CLAMP_TO_EDGE);
      gl.uniform1i(gl.getUniformLocation(program, 'image'), 0);
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(image.naturalWidth * dpr); canvas.height = Math.round(image.naturalHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(gl.getUniformLocation(program, 'aspect'), canvas.width / canvas.height);
      root.classList.add('liquid-glass-logo--ready');
      const start = performance.now(), progressUniform = gl.getUniformLocation(program, 'progress');
      return new Promise(resolve => {
        const draw = now => {
          if (disposed) { resolve(); return; }
          const progress = Math.min(1, (now - start) / duration);
          gl.uniform1f(progressUniform, progress); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
          if (progress < 1) frame = requestAnimationFrame(draw); else resolve();
        };
        frame = requestAnimationFrame(draw);
      });
    } catch (error) {
      console.warn('Logo animation fallback:', error);
      root.classList.remove('liquid-glass-logo--ready');
    }
  }).catch(() => {});
  root.dispose = () => {
    disposed = true; cancelAnimationFrame(frame);
    if (!gl) return;
    if (texture) gl.deleteTexture(texture); if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program); if (vs) gl.deleteShader(vs); if (fs) gl.deleteShader(fs);
  };
  return root;
}
