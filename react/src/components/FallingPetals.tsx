import React, { useEffect, useRef, useCallback } from 'react';

interface Petal {
  x: number;
  y: number;
  size: number;
  width: number;
  opacity: number;
  blur: number;
  layer: 'front' | 'back';
  depth: number;
  driftAmplitude: number;
  driftFrequency: number;
  fallSpeed: number;
  rotation: number;
  rotationSpeed: number;
  tumble: number;
  phase: number;
  time: number;
}

interface FallingPetalsProps {
  enabled: boolean;
  minPetals?: number;
  maxPetals?: number;
  mouseInfluence?: boolean;
}

const FallingPetals: React.FC<FallingPetalsProps> = ({
  enabled = true,
  minPetals = 20,
  maxPetals = 40,
  mouseInfluence = true,
}) => {
  const frontCanvasRef = useRef<HTMLCanvasElement>(null);
  const backCanvasRef = useRef<HTMLCanvasElement>(null);
  const petalsRef = useRef<Petal[]>([]);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  
  const windRef = useRef({
    current: 0,
    target: 0,
    timer: 0,
  });
  
  const mouseRef = useRef({
    x: -9999,
    y: -9999,
    radius: 120,
  });

  const rand = useCallback((min: number, max: number) => {
    return Math.random() * (max - min) + min;
  }, []);

  const makePetal = useCallback((initial: boolean, width: number, height: number) => {
    const size = rand(15, 35);
    const depth = Math.random();
    const duration = rand(8, 12);

    const layer: 'front' | 'back' = depth < 0.45 ? 'back' : 'front';
    return {
      x: rand(0, width),
      y: initial ? rand(0, height) : -50,
      size,
      width: size * rand(0.65, 0.78),
      opacity: rand(0.6, 0.9),
      blur: depth < 0.4 ? rand(0.5, 2) : 0,
      layer,
      depth,
      driftAmplitude: rand(20, 70),
      driftFrequency: rand(0.6, 1.5),
      fallSpeed: height / (duration * 60),
      rotation: rand(0, Math.PI * 2),
      rotationSpeed: rand(-0.015, 0.015),
      tumble: rand(0.5, 1.5),
      phase: rand(0, Math.PI * 2),
      time: rand(0, 1000),
    };
  }, [rand]);

  const drawPetal = useCallback((ctx: CanvasRenderingContext2D, p: Petal) => {
    const len = p.size;
    const wid = p.width;

    const gradient = ctx.createLinearGradient(0, -len / 2, 0, len / 2);
    gradient.addColorStop(0, 'rgba(255,245,250,0.95)');
    gradient.addColorStop(0.5, 'rgba(255,205,225,0.9)');
    gradient.addColorStop(1, 'rgba(255,145,190,0.95)');

    ctx.fillStyle = gradient;

    ctx.beginPath();
    ctx.moveTo(0, -len / 2);
    ctx.bezierCurveTo(wid / 2, -len / 3, wid / 2, len / 3, 0, len / 2);
    ctx.bezierCurveTo(-wid / 2, len / 3, -wid / 2, -len / 3, 0, -len / 2);

    ctx.moveTo(-2, -len / 2 + 2);
    ctx.quadraticCurveTo(0, -len / 2 + 6, 2, -len / 2 + 2);

    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -len / 2 + 4);
    ctx.lineTo(0, len / 2 - 4);
    ctx.stroke();
  }, []);

  const animate = useCallback(function animateFrame(now: number) {
    if (!enabled) return;

    const frontCanvas = frontCanvasRef.current;
    const backCanvas = backCanvasRef.current;
    if (!frontCanvas || !backCanvas) return;

    const frontCtx = frontCanvas.getContext('2d');
    const backCtx = backCanvas.getContext('2d');
    if (!frontCtx || !backCtx) return;

    const delta = now - lastTimeRef.current;
    lastTimeRef.current = now;

    windRef.current.timer += delta;
    if (windRef.current.timer > 3000) {
      windRef.current.timer = 0;
      windRef.current.target = rand(-0.25, 0.25);
    }
    windRef.current.current += (windRef.current.target - windRef.current.current) * 0.002 * delta;

    const width = frontCanvas.width;
    const height = frontCanvas.height;

    frontCtx.clearRect(0, 0, width, height);
    backCtx.clearRect(0, 0, width, height);

    for (const p of petalsRef.current) {
      p.time += delta * 0.001;

      const drift = Math.sin(p.time * p.driftFrequency + p.phase) * p.driftAmplitude;
      const figure8 = Math.sin(p.time * 0.5 + p.phase) * Math.cos(p.time * 0.8) * 10;

      p.x += windRef.current.current + figure8 * 0.01;
      p.y += p.fallSpeed;
      p.rotation += p.rotationSpeed;

      const renderX = p.x + drift;

      let mouseOffsetX = 0;
      let mouseOffsetY = 0;

      if (mouseInfluence) {
        const dx = renderX - mouseRef.current.x;
        const dy = p.y - mouseRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouseRef.current.radius) {
          const force = (1 - dist / mouseRef.current.radius) * 14;
          mouseOffsetX += (dx / dist) * force;
          mouseOffsetY += (dy / dist) * force;
        }
      }

      const ctx = p.layer === 'front' ? frontCtx : backCtx;

      ctx.save();
      ctx.translate(renderX + mouseOffsetX, p.y + mouseOffsetY);
      ctx.rotate(p.rotation);
      ctx.scale(1, Math.cos(p.rotation * p.tumble));
      ctx.globalAlpha = p.opacity;
      ctx.filter = `blur(${p.blur}px)`;

      drawPetal(ctx, p);

      ctx.restore();

      if (p.y > height + 60 || p.x < -100 || p.x > width + 100) {
        Object.assign(p, makePetal(false, width, height));
      }
    }

    animationRef.current = requestAnimationFrame(animateFrame);
  }, [enabled, mouseInfluence, rand, makePetal, drawPetal]);

  useEffect(() => {
    const frontCanvas = frontCanvasRef.current;
    const backCanvas = backCanvasRef.current;
    if (!frontCanvas || !backCanvas) return;

    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      [frontCanvas, backCanvas].forEach((canvas) => {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      });

      const frontCtx = frontCanvas.getContext('2d');
      const backCtx = backCanvas.getContext('2d');
      if (frontCtx && backCtx) {
        frontCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        backCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      const mobile = width < 768;
      const targetCount = mobile ? minPetals : maxPetals;

      petalsRef.current = [];
      for (let i = 0; i < targetCount; i++) {
        petalsRef.current.push(makePetal(true, width, height));
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouseRef.current.x = -9999;
      mouseRef.current.y = -9999;
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    if (enabled) {
      lastTimeRef.current = performance.now();
      animationRef.current = requestAnimationFrame(animate);
    } else {
      const frontCtx = frontCanvas.getContext('2d');
      const backCtx = backCanvas.getContext('2d');
      if (frontCtx && backCtx) {
        frontCtx.clearRect(0, 0, frontCanvas.width, frontCanvas.height);
        backCtx.clearRect(0, 0, backCanvas.width, backCanvas.height);
      }
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [enabled, minPetals, maxPetals, makePetal, animate]);

  return (
    <>
      <canvas
        ref={frontCanvasRef}
        className="petal-canvas"
        style={{ display: enabled ? 'block' : 'none' }}
      />
      <canvas
        ref={backCanvasRef}
        className="petal-canvas behind"
        style={{ display: enabled ? 'block' : 'none' }}
      />
    </>
  );
};

export default FallingPetals;
