import subprocess

# Run the first command: to start web interface at localhost 
command1 = "cd web-interface && npm run dev"
process1 = subprocess.Popen(command1, shell=True)

# Run the second command: to start demoServer
command2 = "cd software/demoServer && node server.js"
process2 = subprocess.Popen(command2, shell=True)

# Wait for both processes to finish
process1.wait()
process2.wait()
