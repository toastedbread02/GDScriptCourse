/* A small, local putt game. It simulates shots; it does not execute GDScript. */
(() => {
  let controller;
  let stopAnimation = () => {};
  const courses = [
    { name: 'Pond-Skip Par 2', par: 2, hole: .88, color: '#1d543e', accent: '#a8d76f', obstacles: [] },
    { name: 'Snack-Cart Slalom', par: 3, hole: .75, color: '#245b43', accent: '#ffd36a', obstacles: [{ at: .46, height: 26, width: 31, emoji: '🛒' }] },
    { name: 'Biscuit’s Big Finish', par: 3, hole: .61, color: '#27513e', accent: '#ffab88', obstacles: [{ at: .42, height: 30, width: 25, emoji: '🍄' }, { at: .72, height: 19, width: 35, emoji: '🪵' }] }
  ];

  function mount(root) {
    unmount();
    const yard = root.querySelector('[data-practice-yard]');
    if (!yard) return;
    controller = new AbortController();
    const signal = controller.signal;
    const canvas = yard.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const angleInput = yard.querySelector('[data-aim]');
    const powerInput = yard.querySelector('[data-power]');
    const angleLabel = yard.querySelector('[data-angle-label]');
    const powerLabel = yard.querySelector('[data-power-label]');
    const strokeLabel = yard.querySelector('[data-strokes]');
    const holeLabel = yard.querySelector('[data-hole]');
    const status = yard.querySelector('[data-practice-status]');
    const shootButton = yard.querySelector('[data-practice-action="shoot"]');
    const nextButton = yard.querySelector('[data-practice-action="next"]');
    let width = 600;
    let height = 220;
    let holeIndex = 0;
    let strokes = 0;
    let totalStrokes = 0;
    let ball = { x: 55, y: 188, vx: 0, vy: 0 };
    let moving = false;
    let holed = false;
    let lastFrame = 0;
    let animation = 0;
    stopAnimation = () => cancelAnimationFrame(animation);

    const floorY = () => height - 30;
    const cup = () => ({ x: width * course().hole, y: floorY() });
    const distanceToCup = () => Math.round(Math.hypot(cup().x - ball.x, cup().y - ball.y));
    const course = () => courses[holeIndex];
    const holeCelebration = () => strokes === 1 ? 'PUP-IN-ONE!' : strokes < course().par ? 'ALBATROSS!' : strokes === course().par ? 'ON PAR, PUP!' : 'SUNK IT!';

    function updateLabels() {
      angleLabel.textContent = `${angleInput.value}°`;
      powerLabel.textContent = `${powerInput.value}%`;
      strokeLabel.textContent = String(strokes);
      holeLabel.textContent = `HOLE ${Math.min(holeIndex + 1, courses.length)} / ${courses.length} · PAR ${course().par}`;
      shootButton.disabled = moving || holed;
      nextButton.hidden = !holed;
      nextButton.textContent = holeIndex === courses.length - 1 ? 'Play another round ↻' : 'Next hole →';
    }

    function draw() {
      const dpr = window.devicePixelRatio || 1;
      const bounds = canvas.getBoundingClientRect();
      width = Math.max(260, bounds.width);
      height = 220;
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const ground = floorY();

      ctx.fillStyle = course().color;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(255,255,255,.035)';
      for (let y = 12; y < height; y += 24) ctx.fillRect(0, y, width, 12);
      for (const obstacle of course().obstacles) {
        const x = width * obstacle.at;
        ctx.fillStyle = obstacle.emoji === '🪵' ? '#9b6744' : obstacle.emoji === '🍄' ? '#b95e55' : '#596c65';
        ctx.fillRect(x - obstacle.width / 2, ground - obstacle.height, obstacle.width, obstacle.height);
        ctx.textAlign = 'center'; ctx.font = '22px system-ui, sans-serif';
        ctx.fillText(obstacle.emoji, x, ground - obstacle.height - 2);
      }
      ctx.fillStyle = '#87b765';
      ctx.fillRect(0, ground + 6, width, height - ground);
      ctx.fillStyle = 'rgba(9,29,20,.2)';
      ctx.fillRect(0, ground + 6, width, 2);

      const target = cup();
      ctx.fillStyle = 'rgba(6,17,12,.42)';
      ctx.beginPath(); ctx.ellipse(target.x, target.y + 5, 13, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff6d6'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(target.x + 1, target.y - 3); ctx.lineTo(target.x + 1, target.y - 50); ctx.stroke();
      ctx.fillStyle = course().accent;
      ctx.beginPath(); ctx.moveTo(target.x + 2, target.y - 49); ctx.lineTo(target.x + 25, target.y - 42); ctx.lineTo(target.x + 2, target.y - 34); ctx.fill();
      ctx.font = '22px system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('🐶', 24, ground - 8);

      if (!moving && !holed) {
        const radians = Number(angleInput.value) * Math.PI / 180;
        const length = 34 + Number(powerInput.value) * .55;
        ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(ball.x, ball.y); ctx.lineTo(ball.x + Math.cos(radians) * length, ball.y - Math.sin(radians) * length); ctx.stroke(); ctx.restore();
      }

      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.beginPath(); ctx.ellipse(ball.x, ground + 3, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff9e8'; ctx.strokeStyle = '#d4d7d0'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(ball.x, ball.y, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#c4c7bf'; ctx.beginPath(); ctx.arc(ball.x - 2, ball.y - 2, 1, 0, Math.PI * 2); ctx.fill();

      if (holed) {
        ctx.fillStyle = '#fff4c9'; ctx.font = '700 18px system-ui, sans-serif';
        ctx.fillText(holeIndex === courses.length - 1 ? 'COURSE CLEARED!' : holeCelebration(), width / 2, 36);
      }
      updateLabels();
    }

    function setStatus(message) { status.textContent = message; }

    function stopShot() {
      moving = false;
      shootButton.disabled = holed;
      if (distanceToCup() < 38) setStatus(`So close! ${distanceToCup()} px from the cup. Turn the power down a touch.`);
      else setStatus(`Ball parked ${distanceToCup()} px from the cup. Change the angle or power and take another swing.`);
      draw();
    }

    function animate(timestamp) {
      if (!moving) return;
      const dt = Math.min(.035, Math.max(.001, (timestamp - (lastFrame || timestamp)) / 1000));
      lastFrame = timestamp;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      ball.vy += 430 * dt;
      const ground = floorY();
      if (ball.y >= ground) {
        ball.y = ground;
        if (Math.abs(ball.vy) > 42) ball.vy *= -.28;
        else ball.vy = 0;
        ball.vx *= Math.pow(.982, dt * 60);
      } else {
        ball.vx *= Math.pow(.998, dt * 60);
      }
      const target = cup();
      if (Math.hypot(target.x - ball.x, target.y - ball.y) < 20 && Math.hypot(ball.vx, ball.vy) < 430) {
        ball.x = target.x; ball.y = target.y; ball.vx = 0; ball.vy = 0;
        moving = false; holed = true; totalStrokes += strokes;
        setStatus(holeIndex === courses.length - 1
          ? `Course cleared in ${totalStrokes} shots. The snack bar is open!`
          : `${holeCelebration()} Hole ${holeIndex + 1} in ${strokes} ${strokes === 1 ? 'shot' : 'shots'}. Biscuit is doing laps.`);
        yard.dispatchEvent(new CustomEvent('quest:practice-hole', { bubbles: true, detail: { hole: holeIndex + 1, strokes } }));
        if (holeIndex === courses.length - 1) yard.dispatchEvent(new CustomEvent('quest:practice-clear', { bubbles: true, detail: { strokes: totalStrokes } }));
        draw();
        return;
      }
      if (ball.x < 12 || ball.x > width - 12) { ball.vx *= -.62; ball.x = Math.max(12, Math.min(width - 12, ball.x)); }
      if (ball.y < 12) { ball.y = 12; ball.vy = Math.abs(ball.vy) * .55; }
      const obstacle = course().obstacles.find((item) => {
        const x = width * item.at;
        return ball.vx > 0 && ball.x + 5 >= x - item.width / 2 && ball.x - 5 <= x + item.width / 2 && ball.y + 5 >= floorY() - item.height;
      });
      if (obstacle) {
        ball.x = width * obstacle.at - obstacle.width / 2 - 7;
        ball.vx *= -.42; ball.vy = Math.min(ball.vy, -55);
        setStatus(`Thunk! ${obstacle.emoji} in the way. Loft it with more angle.`);
        yard.dispatchEvent(new CustomEvent('quest:practice-obstacle', { bubbles: true, detail: { emoji: obstacle.emoji } }));
      }
      if (Math.hypot(ball.vx, ball.vy) < 13) { ball.vx = 0; ball.vy = 0; stopShot(); return; }
      draw();
      animation = requestAnimationFrame(animate);
    }

    function shoot() {
      if (moving || holed) return;
      const radians = Number(angleInput.value) * Math.PI / 180;
      const speed = Number(powerInput.value) / 100 * width * .96;
      ball.vx = Math.cos(radians) * speed;
      ball.vy = -Math.sin(radians) * speed;
      strokes += 1; moving = true; lastFrame = 0;
      setStatus('The ball is rolling!');
      updateLabels();
      yard.dispatchEvent(new CustomEvent('quest:practice-shot', { bubbles: true, detail: { power: Number(powerInput.value), angle: Number(angleInput.value) } }));
      animation = requestAnimationFrame(animate);
    }

    function resetHole() {
      cancelAnimationFrame(animation);
      moving = false; holed = false; strokes = 0;
      ball = { x: 55, y: floorY(), vx: 0, vy: 0 };
      setStatus('Set your aim and power, then shoot. Three holes. One very serious dog.');
      draw();
    }

    function nextHole() {
      if (!holed) return;
      if (holeIndex === courses.length - 1) {
        holeIndex = 0; totalStrokes = 0;
      } else {
        holeIndex += 1;
      }
      resetHole();
    }

    yard.addEventListener('click', (event) => {
      const action = event.target.closest('[data-practice-action]')?.dataset.practiceAction;
      if (action === 'shoot') shoot();
      if (action === 'next') nextHole();
    }, { signal });
    angleInput.addEventListener('input', draw, { signal });
    powerInput.addEventListener('input', draw, { signal });
    window.addEventListener('resize', draw, { signal });
    resetHole();
  }

  function unmount() {
    if (controller) controller.abort();
    stopAnimation();
    stopAnimation = () => {};
    controller = null;
  }

  window.QuestPractice = { mount, unmount };
})();
