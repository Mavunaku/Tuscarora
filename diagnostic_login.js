
async function testLogin(u, p) {
    try {
        const res = await fetch('http://localhost:3001/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, password: p })
        });
        const data = await res.json();
        console.log(`Login ${u} with ${p}: ${data.success ? 'PASS' : 'FAIL (' + data.error + ')'}`);
    } catch (e) {
        console.log(`Login ${u} with ${p}: FAIL (${e.message})`);
    }
}

async function runTests() {
    console.log("Starting diagnostic tests...");
    await testLogin('admin', 'admin123');
    await testLogin('admin', 'newpassword123');
    await testLogin('VS47', 'password48');
    await testLogin('ChrisP', 'password1');
    console.log("Tests complete.");
}

runTests();
