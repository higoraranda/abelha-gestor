// Test-process preload: imported routers must not load backend/.env.
const dotenv = require('dotenv')
dotenv.config = dotenv.configDotenv = () => ({parsed:{}})
