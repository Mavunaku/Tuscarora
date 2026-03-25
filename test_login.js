
async function testLogin() {
    const users = [
        { u: 'admin', p: 'admin123' },
        { u: 'ChrisP', p: 'password1' },
        { u: 'VS47', p: 'password48' }
    ];

    for (const user of users) {
        try {
            const res = await fetch('http://localhost:3001/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: user.u,
                    password: user.p
                })
            });
            const data = await res.json();
            console.log(`Login ${user.u}: ${data.success ? 'PASS' : 'FAIL'}`);
        } catch (e) {
            console.log(`Login ${user.u}: FAIL (${e.message})`);
        }
    }
}

testLogin();
