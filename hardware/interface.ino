#include <SoftwareSerial.h>
#include <DHT.h>

// Software serial for ESP8266 communication
SoftwareSerial espSerial(2, 3);  // RX, TX

// Pin definitions for the DHT11 sensor
#define DHTPIN 4
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

// Pin definitions for sensors and relays
#define SOIL_MOISTURE_PIN A0
#define REED_SWITCH_PIN 5
#define RELAY1_PIN 6  // Relay 1 on 4-channel module
#define RELAY2_PIN 7  // Relay 2 on 4-channel module
#define RELAY3_PIN 8  // Relay 3 on 4-channel module (unused)
#define RELAY4_PIN 9  // Relay 4 on 4-channel module (unused)

// WiFi network credentials
const char* ssid = "Your_SSID";
const char* password = "Your_Password";

// Variables for sensors and relays
int soilMoistureValue = 0;
int reedSwitchState = LOW;
int relay1State = LOW;
int relay2State = LOW;
String data;

// Function to send AT commands to ESP8266
void sendATCommand(String command, int delayTime) {
  espSerial.println(command);
  delay(delayTime);
  
  String response = "";
  while (espSerial.available()) {
    response += (char)espSerial.read();
  }
  
  Serial.print("Command: ");
  Serial.println(command);
  Serial.print("Response: ");
  Serial.println(response);

  // Extract and print the IP if found in the response
  if (response.indexOf("STAIP") != -1) {
    int start = response.indexOf("\"") + 1;
    int end = response.indexOf("\"", start);
    String ip = response.substring(start, end);
    Serial.print("ESP8266 IP Address: ");
    Serial.println(ip);
  }
}

void setup() {
  Serial.begin(115200);  // Serial monitor
  espSerial.begin(9600); // ESP8266 baud rate

  // Initialize DHT11
  dht.begin();

  // Set pin modes
  pinMode(SOIL_MOISTURE_PIN, INPUT);
  pinMode(REED_SWITCH_PIN, INPUT);
  pinMode(RELAY1_PIN, OUTPUT);
  pinMode(RELAY2_PIN, OUTPUT);
  pinMode(RELAY3_PIN, OUTPUT);  // Set unused relay pins as OUTPUT
  pinMode(RELAY4_PIN, OUTPUT);

  // Connect to WiFi using ESP8266 AT commands
  sendATCommand("AT+RST", 2000);               // Reset the module
  sendATCommand("AT+CWMODE=1", 1000);          // Set to Station mode
  sendATCommand("AT+CWJAP=\"" + String(ssid) + "\",\"" + String(password) + "\"", 15000);  // Connect to WiFi
  sendATCommand("AT+CIFSR", 1000);             // Get IP Address
  sendATCommand("AT+CIPMUX=1", 1000);          // Enable multiple connections
  sendATCommand("AT+CIPSERVER=1,8888", 1000);  // Start server on port 8888

  Serial.println("Setup complete.");
}

void loop() {
  // Read temperature and humidity from DHT11
  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();

  // Read soil moisture sensor
  soilMoistureValue = analogRead(SOIL_MOISTURE_PIN);
  soilMoistureValue = 100 - map(soilMoistureValue, 10, 990, 0, 100);

  // Read reed switch state
  reedSwitchState = digitalRead(REED_SWITCH_PIN);

  // Format data as JSON
  data = "{\"temperature\":" + String(temperature) + ",\"humidity\":" + String(humidity) + ",\"soil_moisture\":" + String(soilMoistureValue) + ",\"reed_switch_state\":" + String(reedSwitchState) + ",\"relay1_state\":" + String(relay1State) + ",\"relay2_state\":" + String(relay2State) + "}";

  // Check for incoming connections on ESP8266
  if (espSerial.available()) {
    String request = espSerial.readString();

    // Send data to client if request is received
    if (request.indexOf("/data") != -1) {
      sendATCommand("AT+CIPSEND=0," + String(data.length() + 2), 1000);
      espSerial.print(data);
      espSerial.write('\n');
      delay(1000);
      sendATCommand("AT+CIPCLOSE=0", 1000);  // Close the connection
    }
  }

  // Print sensor values to Serial Monitor
  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.print(" °C, Humidity: ");
  Serial.print(humidity);
  Serial.print(" %, Soil Moisture: ");
  Serial.print(soilMoistureValue);
  Serial.print(" %, Reed Switch: ");
  Serial.println(reedSwitchState);

  // Delay for stability
  delay(1500);
}
