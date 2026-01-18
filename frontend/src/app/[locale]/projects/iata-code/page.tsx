"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Copy, Check, Globe } from "lucide-react";
import Link from "next/link";

// 机场代码数据 - 中国主要机场
const airportCodes: Record<string, string> = {
  // 华北地区
  "PEK": "北京首都",
  "PKX": "北京大兴",
  "TSN": "天津",
  "SJW": "石家庄",
  "TYN": "太原",
  "HET": "呼和浩特",

  // 东北地区
  "DLC": "大连",
  "SHE": "沈阳",
  "CGQ": "长春",
  "HRB": "哈尔滨",
  "YNJ": "延吉",
  "MDG": "牡丹江",
  "JMU": "佳木斯",

  // 华东地区
  "SHA": "上海虹桥",
  "PVG": "上海浦东",
  "NKG": "南京",
  "HGH": "杭州",
  "NGB": "宁波",
  "WNZ": "温州",
  "HFE": "合肥",
  "FOC": "福州",
  "XMN": "厦门",
  "JJN": "泉州",
  "TNA": "济南",
  "TAO": "青岛",
  "YNT": "烟台",
  "WEH": "威海",
  "LYI": "临沂",

  // 华中地区
  "WUH": "武汉",
  "CSX": "长沙",
  "CGO": "郑州",
  "SZX": "深圳",
  "NNG": "南宁",
  "KWL": "桂林",
  "HAK": "海口",
  "SYX": "三亚",

  // 华南地区
  "CAN": "广州",
  "ZUH": "珠海",
  "SWA": "汕头",
  "MXZ": "梅州",

  // 西南地区
  "CTU": "成都天府",
  "TFU": "成都双流",
  "CKG": "重庆",
  "KMG": "昆明",
  "LJG": "丽江",
  "DLU": "大理",
  "JHG": "西双版纳",
  "KWE": "贵阳",
  "ZYI": "遵义",

  // 西北地区
  "XIY": "西安",
  "LHW": "兰州",
  "INC": "银川",
  "XNN": "西宁",
  "URC": "乌鲁木齐",
  "KRL": "库尔勒",
  "AKU": "阿克苏",
  "KHG": "喀什",
  "HTN": "和田",

  // 港澳台地区
  "HKG": "香港",
  "MFM": "澳门",
  "TPE": "台北桃园",
  "TSA": "台北松山",
  "KHH": "高雄",
  "RMQ": "台中",

  // 日本
  "NRT": "东京成田",
  "HND": "东京羽田",
  "KIX": "大阪关西",
  "ITM": "大阪伊丹",
  "NGO": "名古屋",
  "CTS": "札幌",
  "FUK": "福冈",
  "OKA": "冲绳",

  // 韩国
  "ICN": "首尔仁川",
  "GMP": "首尔金浦",
  "PUS": "釜山",
  "CJU": "济州",

  // 东南亚
  "SIN": "新加坡",
  "KUL": "吉隆坡",
  "BKK": "曼谷素万那普",
  "DMK": "曼谷廊曼",
  "SGN": "胡志明市",
  "HAN": "河内",
  "MNL": "马尼拉",
  "CGK": "雅加达",
  "DPS": "巴厘岛",

  // 欧美主要机场
  "LAX": "洛杉矶",
  "SFO": "旧金山",
  "JFK": "纽约肯尼迪",
  "EWR": "纽约纽瓦克",
  "ORD": "芝加哥",
  "SEA": "西雅图",
  "YYZ": "多伦多",
  "YVR": "温哥华",
  "LHR": "伦敦希思罗",
  "CDG": "巴黎戴高乐",
  "FRA": "法兰克福",
  "AMS": "阿姆斯特丹",
  "SYD": "悉尼",
  "MEL": "墨尔本",
  "AKL": "奥克兰",

  // 中东
  "DXB": "迪拜",
  "DOH": "多哈",
  "AUH": "阿布扎比",
};

export default function IataCodePage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);

  // 翻译函数
  const translateCode = (code: string): string => {
    const upperCode = code.toUpperCase().trim();
    return airportCodes[upperCode] || `[${upperCode}]`;
  };

  // 处理翻译
  const handleTranslate = () => {
    if (!input.trim()) {
      setResult("");
      return;
    }

    // 支持多种分隔符：-、/、空格、逗号
    const codes = input
      .split(/[-\/\s,]+/)
      .filter(code => code.trim().length > 0);

    if (codes.length === 0) {
      setResult("");
      return;
    }

    // 翻译每个代码
    const translated = codes.map(translateCode);

    // 用原始分隔符连接
    // 检测原始输入中使用的分隔符
    const separatorMatch = input.match(/[-\/,]/);
    const separator = separatorMatch ? separatorMatch[0] : "-";

    setResult(translated.join(separator));
  };

  // 复制结果
  const handleCopy = async () => {
    if (result) {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-8"
      >
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/projects">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回项目列表
          </Link>
        </Button>
        <h1 className="text-4xl md:text-5xl font-bold mb-6">机场三字代码翻译器</h1>
        <p className="text-lg text-muted-foreground max-w-3xl">
          将IATA机场三字代码转换为中文城市名称，支持多种分隔符格式。
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 主功能区 */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                代码翻译
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 输入区 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">输入机场代码</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="例如: dlc-pek 或 SHA/HKG/NRT"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleTranslate()}
                    className="text-lg font-mono"
                  />
                  <Button onClick={handleTranslate}>
                    翻译
                  </Button>
                </div>
              </div>

              {/* 结果区 */}
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2"
                >
                  <label className="text-sm font-medium">翻译结果</label>
                  <div className="flex gap-2">
                    <div className="flex-1 p-3 rounded-lg bg-primary/10 text-lg font-medium">
                      {result}
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleCopy}
                      className="shrink-0"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* 快捷清空按钮 */}
              {input && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setInput("");
                    setResult("");
                  }}
                >
                  清空输入
                </Button>
              )}
            </CardContent>
          </Card>

          {/* 常用代码参考 */}
          <Card>
            <CardHeader>
              <CardTitle>常用机场代码</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-sm">
                {[
                  ["DLC", "大连"],
                  ["PEK", "北京首都"],
                  ["PKX", "北京大兴"],
                  ["SHA", "上海虹桥"],
                  ["PVG", "上海浦东"],
                  ["CAN", "广州"],
                  ["SZX", "深圳"],
                  ["CTU", "成都天府"],
                  ["CKG", "重庆"],
                  ["HKG", "香港"],
                  ["NRT", "东京成田"],
                  ["ICN", "首尔仁川"],
                ].map(([code, name]) => (
                  <div
                    key={code}
                    className="p-2 rounded bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => setInput(prev => prev ? `${prev}-${code}` : code)}
                  >
                    <span className="font-mono font-medium">{code}</span>
                    <span className="text-muted-foreground ml-1">{name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 侧边栏 */}
        <div className="space-y-6">
          {/* 使用说明 */}
          <Card>
            <CardHeader>
              <CardTitle>使用说明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium shrink-0">
                  1
                </div>
                <p>输入IATA三字代码（不区分大小写）</p>
              </div>
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium shrink-0">
                  2
                </div>
                <p>支持多种分隔符：- / 空格 逗号</p>
              </div>
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium shrink-0">
                  3
                </div>
                <p>按回车键或点击翻译按钮</p>
              </div>
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium shrink-0">
                  4
                </div>
                <p>点击复制按钮复制结果</p>
              </div>
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium shrink-0">
                  5
                </div>
                <p>未知代码显示为 [代码]</p>
              </div>
            </CardContent>
          </Card>

          {/* 示例 */}
          <Card>
            <CardHeader>
              <CardTitle>示例</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="p-2 rounded bg-muted/50">
                <div className="font-mono mb-1">dlc-pek</div>
                <div className="text-muted-foreground">→ 大连-北京首都</div>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <div className="font-mono mb-1">SHA/HKG/NRT</div>
                <div className="text-muted-foreground">→ 上海虹桥/香港/东京成田</div>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <div className="font-mono mb-1">pvg can szx</div>
                <div className="text-muted-foreground">→ 上海浦东-广州-深圳</div>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <div className="font-mono mb-1">DLC,ABC,PEK</div>
                <div className="text-muted-foreground">→ 大连,[ABC],北京首都</div>
              </div>
            </CardContent>
          </Card>

          {/* 数据范围说明 */}
          <Card>
            <CardHeader>
              <CardTitle>数据覆盖</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>包含约100个常用机场代码：</p>
              <ul className="list-disc list-inside space-y-1">
                <li>中国主要机场（约60个）</li>
                <li>港澳台机场（约6个）</li>
                <li>日韩常用机场（约12个）</li>
                <li>东南亚主要机场（约10个）</li>
                <li>欧美主要机场（约15个）</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
