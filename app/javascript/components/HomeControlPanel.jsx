import React, { useState, useEffect } from "react";

const HomeControlPanel = () => {
  const [devices, setDevices] = useState([]);
  const [feedback, setFeedback] = useState({});

  // Default devices that match the original version
  const defaultDevices = [
    {
      id: "1",
      name: "Table Lamp",
      actions: [
        {
          name: "On",
          webhookUrl: "https://your-webhook.com/tablelamp/on",
          method: "GET",
        },
        {
          name: "Off",
          webhookUrl: "https://your-webhook.com/tablelamp/off",
          method: "GET",
        },
      ],
    },
    {
      id: "2",
      name: "Ceiling Light",
      actions: [
        {
          name: "On",
          webhookUrl: "https://your-webhook.com/ceilinglight/on",
          method: "GET",
        },
        {
          name: "Off",
          webhookUrl: "https://your-webhook.com/ceilinglight/off",
          method: "GET",
        },
      ],
    },
    {
      id: "3",
      name: "Floor Lamp",
      actions: [
        {
          name: "On",
          webhookUrl: "https://your-webhook.com/floorlamp/on",
          method: "GET",
        },
        {
          name: "Off",
          webhookUrl: "https://your-webhook.com/floorlamp/off",
          method: "GET",
        },
        {
          name: "Max Brightness",
          webhookUrl: "https://your-webhook.com/floorlamp/max",
          method: "GET",
        },
        {
          name: "Min Brightness",
          webhookUrl: "https://your-webhook.com/floorlamp/min",
          method: "GET",
        },
      ],
    },
    {
      id: "4",
      name: "LED Lightstrip",
      actions: [
        {
          name: "On",
          webhookUrl: "https://your-webhook.com/ledstrip/on",
          method: "GET",
        },
        {
          name: "Off",
          webhookUrl: "https://your-webhook.com/ledstrip/off",
          method: "GET",
        },
        {
          name: "Max Brightness",
          webhookUrl: "https://your-webhook.com/ledstrip/max",
          method: "GET",
        },
        {
          name: "Set Red",
          webhookUrl: "https://your-webhook.com/ledstrip/red",
          method: "GET",
        },
      ],
    },
  ];

  useEffect(() => {
    // Load devices from localStorage or use defaults
    const savedDevices = localStorage.getItem("homeControlDevices");
    if (savedDevices) {
      setDevices(JSON.parse(savedDevices));
    } else {
      setDevices(defaultDevices);
      localStorage.setItem(
        "homeControlDevices",
        JSON.stringify(defaultDevices),
      );
    }
  }, []);

  const handleAction = async (deviceName, webhookUrl, method = "GET") => {
    try {
      // Call webhook directly from client
      const response = await fetch(webhookUrl, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        setFeedback((prev) => ({ ...prev, [deviceName]: "Action successful" }));
      } else {
        setFeedback((prev) => ({ ...prev, [deviceName]: "Action failed" }));
      }
      setTimeout(() => {
        setFeedback((prev) => {
          const newFeedback = { ...prev };
          delete newFeedback[deviceName];
          return newFeedback;
        });
      }, 3000);
    } catch (error) {
      setFeedback((prev) => ({
        ...prev,
        [deviceName]: "Error: " + error.message,
      }));
      setTimeout(() => {
        setFeedback((prev) => {
          const newFeedback = { ...prev };
          delete newFeedback[deviceName];
          return newFeedback;
        });
      }, 3000);
    }
  };

  const handleAllOn = () => {
    devices.forEach((device) => {
      const action = device.actions.find((a) => a.name === "On");
      if (action) handleAction(device.name, action.webhookUrl, action.method);
    });
  };

  const handleAllOff = () => {
    devices.forEach((device) => {
      const action = device.actions.find((a) => a.name === "Off");
      if (action) handleAction(device.name, action.webhookUrl, action.method);
    });
  };

  const handleLedStripMoodLighting = () => {
    devices.forEach((device) => {
      if (device.name !== "LED Lightstrip") {
        const action = device.actions.find((a) => a.name === "Off");
        if (action) handleAction(device.name, action.webhookUrl, action.method);
      }
    });
    const led = devices.find((d) => d.name === "LED Lightstrip");
    if (led) {
      const redAction = led.actions.find((a) => a.name === "Set Red");
      const maxAction = led.actions.find((a) => a.name === "Max Brightness");
      if (redAction)
        handleAction(led.name, redAction.webhookUrl, redAction.method);
      if (maxAction)
        handleAction(led.name, maxAction.webhookUrl, maxAction.method);
    }
  };

  const handleMoodLighting = () => {
    devices.forEach((device) => {
      if (device.name !== "Floor Lamp") {
        const action = device.actions.find((a) => a.name === "Off");
        if (action) handleAction(device.name, action.webhookUrl, action.method);
      }
    });
    const lamp = devices.find((d) => d.name === "Floor Lamp");
    if (lamp) {
      const minAction = lamp.actions.find((a) => a.name === "Min Brightness");
      if (minAction)
        handleAction(lamp.name, minAction.webhookUrl, minAction.method);
    }
  };

  const getButtonColor = (actionName) => {
    switch (actionName) {
      case "On":
        return "#28a745"; // Green
      case "Off":
        return "#dc3545"; // Red
      case "Max Brightness":
        return "#ffc107"; // Yellow
      case "Min Brightness":
        return "#17a2b8"; // Teal
      case "Set Red":
        return "#ff5733"; // Orange Red
      default:
        return "#a04f57"; // Default color
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto">
        <header className="mb-6 flex justify-between items-center flex-wrap gap-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-text">
            Home Control Panel
          </h1>
          <a
            href="/homecontrolpanel/manage"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Manage Devices
          </a>
        </header>

        <section className="mb-6">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-text">
            Bulk Actions
          </h2>
          <div className="flex flex-col sm:flex-row sm:flex-wrap space-y-4 sm:space-y-0 sm:space-x-4">
            <button
              className="w-full sm:w-auto font-semibold px-4 py-2 rounded shadow text-white"
              style={{ backgroundColor: "#28a745" }}
              onClick={handleAllOn}
            >
              All On
            </button>
            <button
              className="w-full sm:w-auto font-semibold px-4 py-2 rounded shadow text-white"
              style={{ backgroundColor: "#dc3545" }}
              onClick={handleAllOff}
            >
              All Off
            </button>
            <button
              className="w-full sm:w-auto font-semibold px-4 py-2 rounded shadow text-white"
              style={{ backgroundColor: "#ff5733" }}
              onClick={handleLedStripMoodLighting}
            >
              LED Strip Mood Lighting
            </button>
            <button
              className="w-full sm:w-auto font-semibold px-4 py-2 rounded shadow text-white"
              style={{ backgroundColor: "#17a2b8" }}
              onClick={handleMoodLighting}
            >
              Mood Lighting
            </button>
          </div>
        </section>

        <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-text">
          Individual device actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {devices.map((device) => (
            <div
              key={device.id}
              className="bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md"
            >
              <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-text">
                {device.name}
              </h2>
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                {device.actions.map((action, index) => (
                  <button
                    key={index}
                    className="w-full sm:w-auto text-white px-3 sm:px-4 py-2 rounded"
                    style={{ backgroundColor: getButtonColor(action.name) }}
                    onClick={() =>
                      handleAction(
                        device.name,
                        action.webhookUrl,
                        action.method,
                      )
                    }
                  >
                    {action.name}
                  </button>
                ))}
              </div>
              {feedback[device.name] && (
                <p className="mt-3 text-sm text-text">
                  {feedback[device.name]}
                </p>
              )}
            </div>
          ))}
        </div>

        {devices.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xl mb-4 text-text">No devices configured</p>
            <a
              href="/homecontrolpanel/manage"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded"
            >
              Add Your First Device
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export default HomeControlPanel;
