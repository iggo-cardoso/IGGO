(function () {
  'use strict';

  const VERT = `
    attribute vec2 p;
    attribute vec2 u;
    varying vec2 v;
    void main(){ v = u; gl_Position = vec4(p, 0.0, 1.0); }
  `;

  const FRAG_FLOW = `
    precision highp float;
    uniform sampler2D uP;
    uniform vec2  uM;
    uniform vec2  uL;
    uniform float uH;
    uniform float uR;
    uniform float uDecay;
    varying vec2 v;
    void main(){
      vec4 prev = texture2D(uP, v);
      vec2 vel  = (prev.rg - 0.5) * 2.0;
      vel *= uDecay;
      if (uH > 0.5) {
        vec2 diff = uM - v;
        float dist = length(diff);
        float radius2 = uR * uR;
        float influence = exp(-dist * dist / radius2);
        vec2 dir = normalize(uM - uL + 0.001);
        float speed = min(length(uM - uL) * 15.0, 1.0);
        if (speed > 0.01) {
          vel += dir * influence * speed * 0.8;
        }
      }
      vel = clamp(vel, -0.8, 0.8);
      float intensity = prev.b * 0.95;
      if (uH > 0.5) {
        vec2 diff = uM - v;
        float dist = length(diff);
        float radius2 = uR * uR;
        float newIntensity = exp(-dist * dist / radius2) * 0.7;
        intensity = max(intensity, newIntensity);
      }
      gl_FragColor = vec4(vel * 0.5 + 0.5, intensity, 1.0);
    }
  `;

  const FRAG_RENDER = `
    precision highp float;
    uniform sampler2D uImg;
    uniform sampler2D uFlow;
    uniform float     uStr;
    varying vec2 v;
    void main(){
      vec4 flow = texture2D(uFlow, v);
      vec2 vel  = (flow.rg - 0.5) * 2.0;
      float intensity = flow.b;
      float strength = uStr * intensity * 0.015;
      vec2 uv = v;
      uv.x += vel.x * strength;
      uv.y += vel.y * strength;
      uv = clamp(uv, 0.001, 0.999);
      vec4 color = texture2D(uImg, uv);
      if (color.a < 0.05) discard;
      gl_FragColor = color;
    }
  `;

  function mkShader(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
      console.error('[webgl-cloud] shader error:', gl.getShaderInfoLog(s));
    return s;
  }

  function mkProg(gl, vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, mkShader(gl, gl.VERTEX_SHADER, vs));
    gl.attachShader(p, mkShader(gl, gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    return p;
  }

  function mkFBO(gl, w, h) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { tex, fbo };
  }

  function mkQuadBuf(gl) {
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1, 0, 1,
       1, -1, 1, 1,
      -1,  1, 0, 0,
       1,  1, 1, 0,
    ]), gl.STATIC_DRAW);
    return buf;
  }

  function bindQuad(gl, prog, buf) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    const pos = gl.getAttribLocation(prog, 'p');
    const uv  = gl.getAttribLocation(prog, 'u');
    if (pos >= 0) { gl.enableVertexAttribArray(pos); gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 16, 0); }
    if (uv  >= 0) { gl.enableVertexAttribArray(uv);  gl.vertexAttribPointer(uv,  2, gl.FLOAT, false, 16, 8); }
  }

  class CloudEffect {
    constructor(img) {
      this.img      = img;
      this.strength = parseFloat(img.dataset.cloudStrength ?? 4);
      this.radius   = parseFloat(img.dataset.cloudRadius   ?? 8) / 100;
      this.decay    = parseFloat(img.dataset.cloudDecay    ?? 95) / 100;
      this.visible  = false;
      this.rafId    = null;

      this._buildCanvas();
      this._initGL();
      this._bindEvents();
      this._observeVisibility();
    }

    _buildCanvas() {
      const img     = this.img;
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:relative;display:inline-block;line-height:0;overflow:hidden;';
      const cs = getComputedStyle(img);
      wrapper.style.width  = cs.width;
      wrapper.style.height = cs.height;
      img.parentNode.insertBefore(wrapper, img);
      wrapper.appendChild(img);

      this.canvas = document.createElement('canvas');
      this.canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;display:block;';
      wrapper.appendChild(this.canvas);
      this.wrapper = wrapper;
    }

    _initGL() {
      const img = this.img;
      const W   = img.naturalWidth  || img.offsetWidth  || 512;
      const H   = img.naturalHeight || img.offsetHeight || 512;
      const DPR = Math.min(window.devicePixelRatio || 1, 2);

      this.canvas.width  = W * DPR;
      this.canvas.height = H * DPR;
      this.W = W * DPR;
      this.H = H * DPR;

      const gl = this.canvas.getContext('webgl', {
        alpha: true,
        premultipliedAlpha: false,
        antialias: false,
      });
      if (!gl) { console.warn('[webgl-cloud] WebGL unavailable'); return; }
      this.gl = gl;

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);

      this.flowProg   = mkProg(gl, VERT, FRAG_FLOW);
      this.renderProg = mkProg(gl, VERT, FRAG_RENDER);
      this.quadBuf    = mkQuadBuf(gl);

      const FW = Math.floor(W / 2);
      const FH = Math.floor(H / 2);
      this.FW = FW; this.FH = FH;

      this.fbos = [mkFBO(gl, FW, FH), mkFBO(gl, FW, FH)];

      const initData = new Uint8Array(FW * FH * 4);
      for (let i = 0; i < FW * FH; i++) {
        initData[i*4]   = 128;
        initData[i*4+1] = 128;
        initData[i*4+2] = 0;
        initData[i*4+3] = 255;
      }
      for (let i = 0; i < 2; i++) {
        gl.bindTexture(gl.TEXTURE_2D, this.fbos[i].tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, FW, FH, 0, gl.RGBA, gl.UNSIGNED_BYTE, initData);
      }
      this.ping = 0;

      const offscreen = document.createElement('canvas');
      offscreen.width  = W;
      offscreen.height = H;
      const ctx = offscreen.getContext('2d');
      ctx.drawImage(img, 0, 0, W, H);

      const imgData = ctx.getImageData(0, 0, W, H);
      for (let i = 0; i < imgData.data.length; i += 4) {
        if (imgData.data[i+3] < 10) {
          imgData.data[i] = imgData.data[i+1] = imgData.data[i+2] = imgData.data[i+3] = 0;
        }
      }
      ctx.putImageData(imgData, 0, 0);

      this.imgTex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.imgTex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, offscreen);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      this.mouse       = [0.5, 0.5];
      this.lastMouse   = [0.5, 0.5];
      this.hovering    = false;
      this.smoothMouse = [0.5, 0.5];
    }

    _observeVisibility() {
      this._obs = new IntersectionObserver(([entry]) => {
        this.visible = entry.isIntersecting;
        if (this.visible && !this.rafId) this._loop();
      }, { threshold: 0 });
      this._obs.observe(this.wrapper);
    }

    _bindEvents() {
      const toNorm = (e) => {
        const r  = this.wrapper.getBoundingClientRect();
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        return [(cx - r.left) / r.width, (cy - r.top) / r.height];
      };

      const onMove = (e) => {
        const m = toNorm(e);
        this.mouse = [Math.min(0.99, Math.max(0.01, m[0])), Math.min(0.99, Math.max(0.01, m[1]))];
      };

      const onStart = (e) => {
        const m = toNorm(e);
        this.mouse       = [Math.min(0.99, Math.max(0.01, m[0])), Math.min(0.99, Math.max(0.01, m[1]))];
        this.lastMouse   = [...this.mouse];
        this.smoothMouse = [...this.mouse];
        this.hovering    = true;
      };

      const onEnd = () => { this.hovering = false; };

      this.wrapper.addEventListener('mouseenter', onStart);
      this.wrapper.addEventListener('mouseleave', onEnd);
      this.wrapper.addEventListener('mousemove',  onMove);
      this.wrapper.addEventListener('touchstart', (e) => { e.preventDefault(); onStart(e); }, { passive: false });
      this.wrapper.addEventListener('touchend',   (e) => { e.preventDefault(); onEnd();    }, { passive: false });
      this.wrapper.addEventListener('touchmove',  (e) => { e.preventDefault(); onMove(e);  }, { passive: false });
    }

    _frame() {
      const gl = this.gl;
      if (!gl) return;

      this.smoothMouse[0] = this.smoothMouse[0] * 0.7 + this.mouse[0] * 0.3;
      this.smoothMouse[1] = this.smoothMouse[1] * 0.7 + this.mouse[1] * 0.3;

      const lastMouse = [...this.lastMouse];
      this.lastMouse  = [...this.smoothMouse];

      gl.useProgram(this.flowProg);
      gl.viewport(0, 0, this.FW, this.FH);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbos[1 - this.ping].fbo);
      bindQuad(gl, this.flowProg, this.quadBuf);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.fbos[this.ping].tex);
      gl.uniform1i(gl.getUniformLocation(this.flowProg, 'uP'), 0);
      gl.uniform2fv(gl.getUniformLocation(this.flowProg, 'uM'), this.smoothMouse);
      gl.uniform2fv(gl.getUniformLocation(this.flowProg, 'uL'), lastMouse);
      gl.uniform1f(gl.getUniformLocation(this.flowProg, 'uH'), this.hovering ? 1 : 0);
      gl.uniform1f(gl.getUniformLocation(this.flowProg, 'uR'), this.radius);
      gl.uniform1f(gl.getUniformLocation(this.flowProg, 'uDecay'), this.decay);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      this.ping = 1 - this.ping;

      gl.useProgram(this.renderProg);
      gl.viewport(0, 0, this.W, this.H);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.clear(gl.COLOR_BUFFER_BIT);
      bindQuad(gl, this.renderProg, this.quadBuf);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.imgTex);
      gl.uniform1i(gl.getUniformLocation(this.renderProg, 'uImg'), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.fbos[this.ping].tex);
      gl.uniform1i(gl.getUniformLocation(this.renderProg, 'uFlow'), 1);
      gl.uniform1f(gl.getUniformLocation(this.renderProg, 'uStr'), this.strength);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    _loop() {
      if (!this.visible) {
        this.rafId = null;
        return;
      }
      this._frame();
      this.rafId = requestAnimationFrame(() => this._loop());
    }
  }

  function initAll() {
    document.querySelectorAll('img[data-effect="webgl-cloud"]').forEach((img) => {
      if (img._cloudEffect) return;
      const run = () => { img._cloudEffect = new CloudEffect(img); };
      if (img.complete && img.naturalWidth > 0) run();
      else img.addEventListener('load', run);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  window.WebGLCloudEffect      = CloudEffect;
  window.initWebGLCloudEffects = initAll;

})();