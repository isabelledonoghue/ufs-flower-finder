# Step 1: Use an official Node.js and Python image
FROM node:22.9.0-buster

# Step 2: Install Python and other dependencies
RUN apt-get update && apt-get install -y \
  python3 \
  python3-pip \
  python3-dev \
  build-essential \
  libnss3 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libfontconfig1 \
  libxcb1 \
  && rm -rf /var/lib/apt/lists/*

# Step 3: Set the working directory for the app
WORKDIR /app

# Step 4: Copy package.json and package-lock.json for Node.js dependencies
COPY package*.json ./

# Step 5: Install Node.js dependencies
RUN npm install

# Step 6: Copy the rest of the application files
COPY . .

# Step 7: Install Python dependencies (if any, e.g., Flask)
COPY requirements.txt .
RUN pip3 install -r requirements.txt

# Step 8: Expose the port the app will run on (adjust as necessary)
EXPOSE 5000

# Step 9: Command to run your app (use Gunicorn to serve the Python app)
CMD ["gunicorn", "--timeout", "0", "app:app"]
