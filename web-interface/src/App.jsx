import React, { useState, useEffect } from "react";
import "./App.css";
import axios from "axios";
import moment from "moment";
import "moment-timezone";
import {
  FaThermometerHalf,
  FaTint,
  FaSeedling,
  FaDoorClosed,
  FaDoorOpen,
} from "react-icons/fa";
import Plot from "react-plotly.js";

export default function Dashboard() {
  const [ngrokUrl, setNgrokUrl] = useState("http://192.168.241.121:8080"); // Replace with your ESP32 IP address
  const [temperature, setTemperature] = useState(0);
  const [humidity, setHumidity] = useState(0);
  const [soilMoisture, setSoilMoisture] = useState(0);
  const [reedState, setReedState] = useState(false);
  const [relayStates, setRelayStates] = useState({
    relay1: false,
    relay2: false,
    relay3: false,
    relay4: false,
  });
  const [temperatureData, setTemperatureData] = useState([]);
  const [humidityData, setHumidityData] = useState([]);
  const [soilMoistureData, setSoilMoistureData] = useState([]);

  const toggleRelay = async (relayNumber) => {
    try {
      const currentRelayState = relayStates[`relay${relayNumber}`];
      const newState = !currentRelayState; // Toggle the current state

      // Send the opposite state to the server
      await axios.post(`${ngrokUrl}/relay${relayNumber}/${newState ? "off" : "on"}`);
      
      // Update the local state to reflect the new state
      setRelayStates((prev) => ({ ...prev, [`relay${relayNumber}`]: newState }));
    } catch (error) {
      console.error(`Error toggling relay ${relayNumber}:`, error);
    }
  };

  const getData = async () => {
    try {
      const response = await axios.get(`${ngrokUrl}/data`);
      setTemperature(response.data.temperature);
      setHumidity(response.data.humidity);
      setSoilMoisture(response.data.soil_moisture);
      setReedState(response.data.reed_switch_state);

      // Update relay states: interpret the opposite
      setRelayStates({
        relay1: response.data.relay1_state === 0, // Interpret 0 as ON
        relay2: response.data.relay2_state === 0, // Interpret 0 as ON
        relay3: response.data.relay3_state === 0, // Interpret 0 as ON
        relay4: response.data.relay4_state === 0, // Interpret 0 as ON
      });

      // Update data arrays with new data
      const currentTime = moment().tz("Asia/Kolkata").format("hh:mm:ss A");
      setTemperatureData((prevData) => [...prevData, { x: currentTime, y: response.data.temperature }]);
      setHumidityData((prevData) => [...prevData, { x: currentTime, y: response.data.humidity }]);
      setSoilMoistureData((prevData) => [...prevData, { x: currentTime, y: response.data.soil_moisture }]);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    const interval = setInterval(getData, 3000);
    return () => clearInterval(interval);
  }, [ngrokUrl]);

  return (
    <div className="min-h-screen py-6 flex flex-col justify-center" style={{ backgroundImage: `url(/background.jpg)`, backgroundSize: 'cover' }}>
      <div className="container mx-auto px-4">
        <div className="text-start mt-4 mb-8">
          <h2 className="text-3xl font-semibold text-gray-100">Smart Home Dashboard</h2>
          <h2 className="text-sm text-gray-400">Connecting...</h2>
        </div>

        {/* Sensor Display */}
        <div className="grid grid-cols-4 gap-4 w-full">
          <div className="sensor-box border-green-500">
            <FaThermometerHalf className="icon text-green-500" />
            <h3>Temperature</h3>
            <p>{temperature}°C</p>
          </div>
          <div className="sensor-box border-blue-500">
            <FaTint className="icon text-blue-500" />
            <h3>Humidity</h3>
            <p>{humidity}%</p>
          </div>
          <div className="sensor-box border-yellow-500">
            <FaSeedling className="icon text-yellow-500" />
            <h3>Soil Moisture</h3>
            <p>{soilMoisture}%</p>
          </div>
          <div className="sensor-box">
            <div className="flex items-center justify-center">
              {reedState ? (
                <FaDoorOpen className="icon text-red-500" /> // Red when door open
              ) : (
                <FaDoorClosed className="icon text-green-500" /> // Green when door closed
              )}
              <h3 className="ml-2">{reedState ? "Door Open" : "Door Closed"}</h3>
            </div>
          </div>
        </div>

        {/* Appliance Controls */}
        <div className="grid grid-cols-4 gap-4 w-full mt-8">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="bg-gray-700 rounded-lg p-2">
              <h3 className="text-sm font-semibold text-gray-100 mb-1">Appliance {i + 1}</h3>
              <button
                onClick={() => toggleRelay(i + 1)}
                className={`px-2 py-1 w-full ${relayStates[`relay${i + 1}`] ? "bg-green-500" : "bg-red-500"} text-gray-800 rounded shadow`}
              >
                {relayStates[`relay${i + 1}`] ? "Turn ON" : "Turn OFF"}
              </button>
            </div>
          ))}
        </div>

        {/* Data Graphs */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { title: "Temperature Trend", data: temperatureData, color: "#00ff00", yaxis: "Value in °C" },
            { title: "Humidity Trend", data: humidityData, color: "#19a7ce", yaxis: "Value in %" },
            { title: "Soil Moisture Trend", data: soilMoistureData, color: "#feff86", yaxis: "Value in %" },
          ].map(({ title, data, color, yaxis }, index) => (
            <div key={index} className="graph-box bg-gray-700 p-4 border-4 rounded-lg">
              <h4 className="text-lg font-medium text-gray-100 mb-4">{title}</h4>
              <Plot
                data={[{ x: data.map((d) => d.x), y: data.map((d) => d.y), type: "scatter", mode: "lines", marker: { color } }]}
                layout={{
                  xaxis: { title: "Time" },
                  yaxis: { title: yaxis },
                  title: title,
                  autosize: true,
                  plot_bgcolor: "#2d3748",
                  paper_bgcolor: "#2d3748",
                  margin: { l: 40, r: 20, t: 40, b: 40 },
                }}
                config={{
                  responsive: true,
                  displaylogo: false,
                  modeBarButtonsToRemove: ["zoom2d", "pan2d", "resetScale2d", "toggleSpikelines"],
                }}
                style={{ width: "100%", height: "300px" }}
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-400">
          <h2>Vardan Tuteja || Rashi Pahuja || Sidhi Ojha</h2>
          <h2>Project Guide: Dr. Chanthini Baskar</h2>
        </div>
      </div>
    </div>
  );
}