const API = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const mensaje = document.getElementById('loginMensaje');

  if (!form) return; // seguridad

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); // 🔴 ESTO ES LO QUE FALTABA

    const usuario = document.getElementById('usuario').value.trim();
    const password = document.getElementById('password').value.trim();

    mensaje.textContent = 'Verificando...';

    try {
      const res = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, password })
      });

      const data = await res.json();

      if (res.ok) {
        mensaje.textContent = '✅ Bienvenido';
        mensaje.style.color = '#00ff99';

        // 👉 guardar sesión simple
        localStorage.setItem('logeado', 'true');

        // 👉 ir al sistema
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 800);

      } else {
        mensaje.textContent = data.mensaje || 'Credenciales incorrectas';
        mensaje.style.color = '#ff4d4d';
      }

    } catch (error) {
      mensaje.textContent = '❌ Error de conexión';
      mensaje.style.color = '#ff4d4d';
    }
  });
});

