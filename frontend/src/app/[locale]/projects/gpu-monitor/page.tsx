"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lock, LogOut, RefreshCw, Cpu, Thermometer, Zap, HardDrive } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6101";

interface GpuStatus {
  gpu_index: number;
  gpu_name: string;
  utilization: number;
  memory_used: number;
  memory_total: number;
  temperature: number;
  power_draw: number;
  power_limit: number;
  timestamp: string;
}

interface Machine {
  hostname: string;
  last_seen: string;
}

interface HistoryPoint {
  utilization: number;
  memory_used: number;
  memory_total: number;
  temperature: number;
  power_draw: number;
  power_limit: number;
  timestamp: string;
}

export default function GpuMonitorPage() {
  const [password, setPassword] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [rememberDevice, setRememberDevice] = useState(true);

  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<string>("");
  const [gpuStatus, setGpuStatus] = useState<GpuStatus[]>([]);
  const [history, setHistory] = useState<Record<number, HistoryPoint[]>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getToken = () => localStorage.getItem("gpu_monitor_token");

  // Verify existing token on mount
  useEffect(() => {
    const verifyExistingToken = async () => {
      const token = getToken();
      if (!token) {
        setIsCheckingToken(false);
        return;
      }
      try {
        const response = await fetch(`${API_BASE_URL}/api/gpu-monitor/verify-token`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          setIsVerified(true);
        } else {
          localStorage.removeItem("gpu_monitor_token");
        }
      } catch {
        localStorage.removeItem("gpu_monitor_token");
      } finally {
        setIsCheckingToken(false);
      }
    };
    verifyExistingToken();
  }, []);

  const handleLogin = async () => {
    if (!password.trim()) {
      setError("Please enter password");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/gpu-monitor/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, remember_device: rememberDevice }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        localStorage.setItem("gpu_monitor_token", data.token);
        setIsVerified(true);
      } else {
        setError(data.detail || "Invalid password");
      }
    } catch {
      setError("Login failed, please retry");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("gpu_monitor_token");
    setIsVerified(false);
    setPassword("");
    setMachines([]);
    setGpuStatus([]);
    setHistory({});
    setSelectedMachine("");
  };

  const fetchMachines = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/gpu-monitor/machines`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setMachines(data.machines || []);
        if (data.machines?.length > 0 && !selectedMachine) {
          setSelectedMachine(data.machines[0].hostname);
        }
      }
    } catch {
      // ignore
    }
  }, [selectedMachine]);

  const fetchStatus = useCallback(async (hostname: string) => {
    const token = getToken();
    if (!token || !hostname) return;
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/gpu-monitor/status?hostname=${encodeURIComponent(hostname)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setGpuStatus(data.gpus || []);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchHistory = useCallback(async (hostname: string, gpuIndices: number[]) => {
    const token = getToken();
    if (!token || !hostname) return;
    const newHistory: Record<number, HistoryPoint[]> = {};
    await Promise.all(
      gpuIndices.map(async (idx) => {
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/gpu-monitor/history?hostname=${encodeURIComponent(hostname)}&gpu_index=${idx}&hours=24`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (response.ok) {
            const data = await response.json();
            newHistory[idx] = data.data || [];
          }
        } catch {
          // ignore
        }
      })
    );
    setHistory(newHistory);
  }, []);

  const refreshData = useCallback(async () => {
    if (!selectedMachine) return;
    setIsRefreshing(true);
    await fetchStatus(selectedMachine);
    const indices = gpuStatus.map((g) => g.gpu_index);
    if (indices.length > 0) {
      await fetchHistory(selectedMachine, indices);
    }
    setIsRefreshing(false);
  }, [selectedMachine, gpuStatus, fetchStatus, fetchHistory]);

  // Load machines on auth
  useEffect(() => {
    if (isVerified) {
      fetchMachines();
    }
  }, [isVerified, fetchMachines]);

  // Load status when machine selected
  useEffect(() => {
    if (isVerified && selectedMachine) {
      fetchStatus(selectedMachine);
    }
  }, [isVerified, selectedMachine, fetchStatus]);

  // Load history when status loaded
  useEffect(() => {
    if (isVerified && selectedMachine && gpuStatus.length > 0) {
      const indices = gpuStatus.map((g) => g.gpu_index);
      fetchHistory(selectedMachine, indices);
    }
  }, [isVerified, selectedMachine, gpuStatus, fetchHistory]);

  // Auto-refresh every 60s
  useEffect(() => {
    if (!isVerified || !selectedMachine) return;
    const interval = setInterval(() => {
      fetchStatus(selectedMachine);
    }, 60000);
    return () => clearInterval(interval);
  }, [isVerified, selectedMachine, fetchStatus]);

  // Loading screen
  if (isCheckingToken) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Login screen
  if (!isVerified) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center items-center min-h-[60vh]">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>GPU Monitor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberDevice}
                onCheckedChange={(checked) => setRememberDevice(checked === true)}
              />
              <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                Remember this device (30 days)
              </label>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" onClick={handleLogin} disabled={isLoading}>
              {isLoading ? "Verifying..." : "Login"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Format timestamp for display
  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleString();
    } catch {
      return ts;
    }
  };

  // Format chart time label
  const formatChartTime = (ts: string) => {
    try {
      const d = new Date(ts);
      return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    } catch {
      return "";
    }
  };

  // Get utilization color
  const getUtilColor = (val: number) => {
    if (val >= 80) return "text-red-500";
    if (val >= 50) return "text-yellow-500";
    return "text-green-500";
  };

  const getTempColor = (val: number) => {
    if (val >= 80) return "text-red-500";
    if (val >= 60) return "text-yellow-500";
    return "text-green-500";
  };

  // Main dashboard
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">GPU Monitor</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refreshData} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-1" />
            Logout
          </Button>
        </div>
      </div>

      {/* No machines */}
      {machines.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No machines reporting yet. Configure GPU machines to push metrics.
          </CardContent>
        </Card>
      )}

      {/* Machine tabs */}
      {machines.length > 0 && (
        <Tabs value={selectedMachine} onValueChange={setSelectedMachine}>
          <TabsList className="mb-4">
            {machines.map((m) => (
              <TabsTrigger key={m.hostname} value={m.hostname}>
                {m.hostname}
              </TabsTrigger>
            ))}
          </TabsList>

          {machines.map((m) => (
            <TabsContent key={m.hostname} value={m.hostname}>
              {/* Last updated */}
              {gpuStatus.length > 0 && gpuStatus[0].timestamp && (
                <p className="text-sm text-muted-foreground mb-4">
                  Last updated: {formatTime(gpuStatus[0].timestamp)}
                </p>
              )}

              {/* GPU Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                {gpuStatus.map((gpu) => (
                  <Card key={gpu.gpu_index}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        GPU {gpu.gpu_index}: {gpu.gpu_name || "Unknown"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Cpu className="h-3.5 w-3.5" /> Utilization
                        </span>
                        <span className={`font-mono font-semibold ${getUtilColor(gpu.utilization)}`}>
                          {gpu.utilization.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-1.5">
                        <div
                          className="bg-primary rounded-full h-1.5 transition-all"
                          style={{ width: `${Math.min(gpu.utilization, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <HardDrive className="h-3.5 w-3.5" /> Memory
                        </span>
                        <span className="font-mono">
                          {(gpu.memory_used / 1024).toFixed(1)}/{(gpu.memory_total / 1024).toFixed(1)} GB
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-1.5">
                        <div
                          className="bg-blue-500 rounded-full h-1.5 transition-all"
                          style={{ width: `${gpu.memory_total > 0 ? (gpu.memory_used / gpu.memory_total) * 100 : 0}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Thermometer className="h-3.5 w-3.5" /> Temperature
                        </span>
                        <span className={`font-mono font-semibold ${getTempColor(gpu.temperature)}`}>
                          {gpu.temperature.toFixed(0)}°C
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Zap className="h-3.5 w-3.5" /> Power
                        </span>
                        <span className="font-mono">
                          {gpu.power_draw.toFixed(0)}/{gpu.power_limit.toFixed(0)} W
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Charts */}
              {Object.keys(history).length > 0 && (
                <div className="space-y-6">
                  {/* Utilization Chart */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">GPU Utilization (24h)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis
                              dataKey="timestamp"
                              tickFormatter={formatChartTime}
                              type="category"
                              allowDuplicatedCategory={false}
                              fontSize={11}
                            />
                            <YAxis domain={[0, 100]} unit="%" fontSize={11} />
                            <Tooltip
                              labelFormatter={formatTime}
                              formatter={(value) => [`${Number(value).toFixed(1)}%`, ""]}
                            />
                            <Legend />
                            {Object.entries(history).map(([idx, data], i) => (
                              <Line
                                key={idx}
                                data={data}
                                dataKey="utilization"
                                name={`GPU ${idx}`}
                                stroke={COLORS[i % COLORS.length]}
                                dot={false}
                                strokeWidth={1.5}
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Memory Chart */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Memory Usage (24h)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis
                              dataKey="timestamp"
                              tickFormatter={formatChartTime}
                              type="category"
                              allowDuplicatedCategory={false}
                              fontSize={11}
                            />
                            <YAxis unit=" MB" fontSize={11} />
                            <Tooltip
                              labelFormatter={formatTime}
                              formatter={(value) => [`${Number(value).toFixed(0)} MB`, ""]}
                            />
                            <Legend />
                            {Object.entries(history).map(([idx, data], i) => (
                              <Line
                                key={idx}
                                data={data}
                                dataKey="memory_used"
                                name={`GPU ${idx}`}
                                stroke={COLORS[i % COLORS.length]}
                                dot={false}
                                strokeWidth={1.5}
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Temperature Chart */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Temperature (24h)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis
                              dataKey="timestamp"
                              tickFormatter={formatChartTime}
                              type="category"
                              allowDuplicatedCategory={false}
                              fontSize={11}
                            />
                            <YAxis unit="°C" fontSize={11} />
                            <Tooltip
                              labelFormatter={formatTime}
                              formatter={(value) => [`${Number(value).toFixed(1)}°C`, ""]}
                            />
                            <Legend />
                            {Object.entries(history).map(([idx, data], i) => (
                              <Line
                                key={idx}
                                data={data}
                                dataKey="temperature"
                                name={`GPU ${idx}`}
                                stroke={COLORS[i % COLORS.length]}
                                dot={false}
                                strokeWidth={1.5}
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#0088fe", "#00c49f", "#ffbb28", "#ff8042"];
