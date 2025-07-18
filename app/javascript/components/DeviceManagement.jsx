import React, { useState, useEffect } from "react";

const DeviceManagement = () => {
  const [devices, setDevices] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [newDevice, setNewDevice] = useState({
    name: "",
    actions: [{ name: "", webhookUrl: "", method: "GET" }],
  });

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

  const saveDevices = (newDevices) => {
    setDevices(newDevices);
    localStorage.setItem("homeControlDevices", JSON.stringify(newDevices));
  };

  const handleAddDevice = () => {
    if (!newDevice.name.trim()) return;

    const device = {
      ...newDevice,
      id: Date.now().toString(),
      actions: newDevice.actions.filter(
        (action) => action.name.trim() && action.webhookUrl.trim(),
      ),
    };

    if (device.actions.length === 0) return;

    const updatedDevices = [...devices, device];
    saveDevices(updatedDevices);
    setNewDevice({
      name: "",
      actions: [{ name: "", webhookUrl: "", method: "GET" }],
    });
    setShowAddForm(false);
  };

  const handleEditDevice = (device) => {
    setEditingDevice({ ...device });
  };

  const handleUpdateDevice = () => {
    if (!editingDevice.name.trim()) return;

    const updatedDevice = {
      ...editingDevice,
      actions: editingDevice.actions.filter(
        (action) => action.name.trim() && action.webhookUrl.trim(),
      ),
    };

    if (updatedDevice.actions.length === 0) return;

    const updatedDevices = devices.map((d) =>
      d.id === editingDevice.id ? updatedDevice : d,
    );
    saveDevices(updatedDevices);
    setEditingDevice(null);
  };

  const handleDeleteDevice = (deviceId) => {
    const updatedDevices = devices.filter((d) => d.id !== deviceId);
    saveDevices(updatedDevices);
  };

  const addAction = (deviceObj, setDeviceObj) => {
    setDeviceObj({
      ...deviceObj,
      actions: [
        ...deviceObj.actions,
        { name: "", webhookUrl: "", method: "GET" },
      ],
    });
  };

  const removeAction = (deviceObj, setDeviceObj, index) => {
    setDeviceObj({
      ...deviceObj,
      actions: deviceObj.actions.filter((_, i) => i !== index),
    });
  };

  const updateAction = (deviceObj, setDeviceObj, index, field, value) => {
    const updatedActions = deviceObj.actions.map((action, i) =>
      i === index ? { ...action, [field]: value } : action,
    );
    setDeviceObj({ ...deviceObj, actions: updatedActions });
  };

  const resetToDefaults = () => {
    if (confirm("This will reset all devices to defaults. Are you sure?")) {
      saveDevices(defaultDevices);
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="mx-auto">
        <header className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-text">
            Device Management
          </h1>
          <a
            href="/homecontrolpanel"
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Back to Control Panel
          </a>
        </header>

        <div className="mb-6 flex flex-wrap gap-4">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            {showAddForm ? "Cancel" : "Add New Device"}
          </button>
          <button
            onClick={resetToDefaults}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
          >
            Reset to Defaults
          </button>
        </div>

        {/* Add Device Form */}
        {showAddForm && (
          <div className="mb-8 p-6 rounded-lg bg-gray-800">
            <h2 className="text-2xl font-semibold mb-4 text-text">
              Add New Device
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-text">
                Device Name
              </label>
              <input
                type="text"
                value={newDevice.name}
                onChange={(e) =>
                  setNewDevice({ ...newDevice, name: e.target.value })
                }
                className="w-full p-2 rounded bg-gray-700 text-white"
                placeholder="Enter device name"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-text">
                Actions
              </label>
              {newDevice.actions.map((action, index) => (
                <div
                  key={index}
                  className="mb-3 p-3 border rounded border-purple-300"
                >
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <input
                      type="text"
                      value={action.name}
                      onChange={(e) =>
                        updateAction(
                          newDevice,
                          setNewDevice,
                          index,
                          "name",
                          e.target.value,
                        )
                      }
                      className="p-2 rounded bg-gray-700 text-white"
                      placeholder="Action name"
                    />
                    <input
                      type="url"
                      value={action.webhookUrl}
                      onChange={(e) =>
                        updateAction(
                          newDevice,
                          setNewDevice,
                          index,
                          "webhookUrl",
                          e.target.value,
                        )
                      }
                      className="md:col-span-2 p-2 rounded bg-gray-700 text-white"
                      placeholder="Webhook URL"
                    />
                    <div className="flex gap-2">
                      <select
                        value={action.method}
                        onChange={(e) =>
                          updateAction(
                            newDevice,
                            setNewDevice,
                            index,
                            "method",
                            e.target.value,
                          )
                        }
                        className="p-2 rounded bg-gray-700 text-white flex-1"
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                      </select>
                      <button
                        onClick={() =>
                          removeAction(newDevice, setNewDevice, index)
                        }
                        className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={() => addAction(newDevice, setNewDevice)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
              >
                Add Action
              </button>
            </div>
            <button
              onClick={handleAddDevice}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            >
              Save Device
            </button>
          </div>
        )}

        {/* Edit Device Form */}
        {editingDevice && (
          <div className="mb-8 p-6 rounded-lg bg-gray-800">
            <h2 className="text-2xl font-semibold mb-4 text-text">
              Edit Device
            </h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-text">
                Device Name
              </label>
              <input
                type="text"
                value={editingDevice.name}
                onChange={(e) =>
                  setEditingDevice({ ...editingDevice, name: e.target.value })
                }
                className="w-full p-2 rounded bg-gray-700 text-white"
                placeholder="Enter device name"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-text">
                Actions
              </label>
              {editingDevice.actions.map((action, index) => (
                <div
                  key={index}
                  className="mb-3 p-3 border rounded border-purple-300"
                >
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <input
                      type="text"
                      value={action.name}
                      onChange={(e) =>
                        updateAction(
                          editingDevice,
                          setEditingDevice,
                          index,
                          "name",
                          e.target.value,
                        )
                      }
                      className="p-2 rounded bg-gray-700 text-white"
                      placeholder="Action name"
                    />
                    <input
                      type="url"
                      value={action.webhookUrl}
                      onChange={(e) =>
                        updateAction(
                          editingDevice,
                          setEditingDevice,
                          index,
                          "webhookUrl",
                          e.target.value,
                        )
                      }
                      className="md:col-span-2 p-2 rounded bg-gray-700 text-white"
                      placeholder="Webhook URL"
                    />
                    <div className="flex gap-2">
                      <select
                        value={action.method}
                        onChange={(e) =>
                          updateAction(
                            editingDevice,
                            setEditingDevice,
                            index,
                            "method",
                            e.target.value,
                          )
                        }
                        className="p-2 rounded bg-gray-700 text-white flex-1"
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                      </select>
                      <button
                        onClick={() =>
                          removeAction(editingDevice, setEditingDevice, index)
                        }
                        className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={() => addAction(editingDevice, setEditingDevice)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
              >
                Add Action
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleUpdateDevice}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              >
                Update Device
              </button>
              <button
                onClick={() => setEditingDevice(null)}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Device List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.map((device) => (
            <div key={device.id} className="p-6 rounded-lg bg-gray-800">
              <h3 className="text-xl font-semibold mb-3 text-text">
                {device.name}
              </h3>
              <div className="mb-4">
                <p className="text-sm mb-2 text-text">Actions:</p>
                {device.actions.map((action, index) => (
                  <div key={index} className="text-sm mb-1 text-gray-300">
                    <span className="font-medium">{action.name}</span> (
                    {action.method})
                    <div className="text-xs break-all text-gray-500">
                      {action.webhookUrl}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEditDevice(device)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteDevice(device.id)}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DeviceManagement;
