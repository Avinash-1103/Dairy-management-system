const form = document.getElementById("loginForm");
const msg = document.getElementById("msg");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    msg.textContent = "Checking credentials...";
    msg.style.color = "gray";

    try {
        // Call Python API
        const response = await window.pywebview.api.login(
            JSON.stringify({ username, password })
        );
        const result = JSON.parse(response);

        if (result.success) {
            msg.style.color = "green";
            msg.textContent = result.message;

            setTimeout(() => {
                window.location.href = "dashboard.html"; // (add later)
            }, 1000);
        } else {
            msg.style.color = "red";
            msg.textContent = result.message;
        }
    } catch (err) {
        msg.style.color = "red";
        msg.textContent = "Error connecting to backend!";
    }
});
