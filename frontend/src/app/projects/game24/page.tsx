"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Lightbulb,
  Timer,
  TrendingUp,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";

interface GameState {
  numbers: number[];
  userInput: string;
  attempts: number;
  solved: number;
  timeElapsed: number;
  isPlaying: boolean;
  message: string;
  messageType: "success" | "error" | "info" | "";
  history: { numbers: number[], expression: string, success: boolean }[];
}

export default function Game24Page() {
  const [gameState, setGameState] = useState<GameState>({
    numbers: [],
    userInput: "",
    attempts: 0,
    solved: 0,
    timeElapsed: 0,
    isPlaying: false,
    message: "",
    messageType: "",
    history: []
  });

  const [showHint, setShowHint] = useState(false);

  // 生成随机数字
  const generateNumbers = () => {
    const numbers = Array.from({ length: 4 }, () => Math.floor(Math.random() * 13) + 1);
    setGameState(prev => ({
      ...prev,
      numbers,
      userInput: "",
      message: "",
      messageType: "",
      isPlaying: true,
      timeElapsed: 0
    }));
    setShowHint(false);
  };

  // 计时器
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState.isPlaying) {
      interval = setInterval(() => {
        setGameState(prev => ({
          ...prev,
          timeElapsed: prev.timeElapsed + 1
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState.isPlaying]);

  // 验证表达式
  const validateExpression = (expression: string, numbers: number[]): { valid: boolean, result?: number, error?: string } => {
    try {
      // 检查是否只包含数字、运算符和括号
      const validChars = /^[\d+\-*/().\s]+$/;
      if (!validChars.test(expression)) {
        return { valid: false, error: "表达式包含无效字符" };
      }

      // 提取表达式中的所有数字
      const usedNumbers = expression.match(/\d+/g)?.map(Number) || [];

      // 检查数字数量
      if (usedNumbers.length !== 4) {
        return { valid: false, error: "必须使用恰好4个数字" };
      }

      // 检查使用的数字是否匹配（排序后比较）
      const sortedUsed = [...usedNumbers].sort((a, b) => a - b);
      const sortedOriginal = [...numbers].sort((a, b) => a - b);

      if (sortedUsed.join(',') !== sortedOriginal.join(',')) {
        return { valid: false, error: "必须使用给定的所有数字，每个数字使用一次" };
      }

      // 计算结果
      // eslint-disable-next-line no-eval
      const result = eval(expression);

      if (Math.abs(result - 24) < 0.0001) {
        return { valid: true, result };
      } else {
        return { valid: false, error: `结果是 ${result.toFixed(2)}，不是 24` };
      }
    } catch (error) {
      return { valid: false, error: "表达式格式错误" };
    }
  };

  // 提交答案
  const handleSubmit = () => {
    if (!gameState.userInput.trim()) {
      setGameState(prev => ({
        ...prev,
        message: "请输入表达式",
        messageType: "info"
      }));
      return;
    }

    const validation = validateExpression(gameState.userInput, gameState.numbers);

    setGameState(prev => ({
      ...prev,
      attempts: prev.attempts + 1,
      solved: validation.valid ? prev.solved + 1 : prev.solved,
      message: validation.valid ? `恭喜！用时 ${prev.timeElapsed} 秒` : validation.error || "答案错误",
      messageType: validation.valid ? "success" : "error",
      isPlaying: !validation.valid,
      history: [
        {
          numbers: prev.numbers,
          expression: prev.userInput,
          success: validation.valid
        },
        ...prev.history
      ].slice(0, 10) // 只保留最近10条记录
    }));

    if (validation.valid) {
      setTimeout(() => {
        generateNumbers();
      }, 2000);
    }
  };

  // 完整的解题算法（支持分数运算）
  const findSolution = (numbers: number[]): string | null => {
    // 递归计算所有可能的表达式
    const calculate = (nums: number[], exprs: string[]): { result: number, expr: string }[] => {
      if (nums.length === 1) {
        return [{ result: nums[0], expr: exprs[0] }];
      }

      const results: { result: number, expr: string }[] = [];
      const operators = [
        { symbol: '+', calc: (a: number, b: number) => a + b },
        { symbol: '-', calc: (a: number, b: number) => a - b },
        { symbol: '*', calc: (a: number, b: number) => a * b },
        { symbol: '/', calc: (a: number, b: number) => b !== 0 ? a / b : NaN },
      ];

      // 尝试所有可能的两个数字组合
      for (let i = 0; i < nums.length; i++) {
        for (let j = 0; j < nums.length; j++) {
          if (i === j) continue;

          const a = nums[i];
          const b = nums[j];
          const exprA = exprs[i];
          const exprB = exprs[j];

          // 创建新的数字和表达式数组（移除i和j）
          const newNums: number[] = [];
          const newExprs: string[] = [];
          for (let k = 0; k < nums.length; k++) {
            if (k !== i && k !== j) {
              newNums.push(nums[k]);
              newExprs.push(exprs[k]);
            }
          }

          // 尝试所有运算符
          for (const op of operators) {
            const result = op.calc(a, b);
            if (!isNaN(result) && isFinite(result)) {
              // 根据运算符优先级决定是否需要括号
              let newExpr: string;
              if (op.symbol === '+' || op.symbol === '-') {
                newExpr = `(${exprA}${op.symbol}${exprB})`;
              } else {
                // 乘除法：如果操作数是表达式，需要括号
                const needParenA = exprA.includes('+') || exprA.includes('-');
                const needParenB = exprB.includes('+') || exprB.includes('-') ||
                                   (op.symbol === '/' && (exprB.includes('*') || exprB.includes('/')));
                newExpr = `${needParenA ? `(${exprA})` : exprA}${op.symbol}${needParenB ? `(${exprB})` : exprB}`;
              }

              // 递归计算剩余数字
              const subResults = calculate([result, ...newNums], [newExpr, ...newExprs]);
              results.push(...subResults);
            }
          }
        }
      }

      return results;
    };

    // 开始计算
    const allResults = calculate(numbers, numbers.map(String));

    // 查找结果为24的表达式
    for (const { result, expr } of allResults) {
      if (Math.abs(result - 24) < 0.0001) {
        return expr;
      }
    }

    return null;
  };

  const handleShowHint = () => {
    const solution = findSolution(gameState.numbers);
    if (solution) {
      setGameState(prev => ({
        ...prev,
        message: `提示：${solution}`,
        messageType: "info"
      }));
      setShowHint(true);
    } else {
      setGameState(prev => ({
        ...prev,
        message: "此题无解！",
        messageType: "info"
      }));
    }
  };

  // 处理"无解"按钮点击
  const handleNoSolution = () => {
    const solution = findSolution(gameState.numbers);

    if (solution === null) {
      // 确实无解，用户判断正确
      setGameState(prev => ({
        ...prev,
        attempts: prev.attempts + 1,
        solved: prev.solved + 1,
        message: `正确！此题确实无解。用时 ${prev.timeElapsed} 秒`,
        messageType: "success",
        isPlaying: false,
        history: [
          {
            numbers: prev.numbers,
            expression: "无解",
            success: true
          },
          ...prev.history
        ].slice(0, 10)
      }));

      setTimeout(() => {
        generateNumbers();
      }, 2000);
    } else {
      // 有解，用户判断错误
      setGameState(prev => ({
        ...prev,
        attempts: prev.attempts + 1,
        message: `判断错误！此题有解，例如：${solution}`,
        messageType: "error",
        history: [
          {
            numbers: prev.numbers,
            expression: "无解（错误）",
            success: false
          },
          ...prev.history
        ].slice(0, 10)
      }));
    }
  };

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
        <h1 className="text-4xl md:text-5xl font-bold mb-6">计算24小游戏</h1>
        <p className="text-lg text-muted-foreground max-w-3xl">
          使用给定的4个数字，通过加、减、乘、除运算得到24。每个数字必须使用恰好一次！
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 主游戏区 */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>游戏区域</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Timer className="h-3 w-3" />
                    {formatTime(gameState.timeElapsed)}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateNumbers}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    新题目
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {gameState.numbers.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">点击"新题目"开始游戏</p>
                  <Button onClick={generateNumbers} size="lg">
                    开始游戏
                  </Button>
                </div>
              ) : (
                <>
                  {/* 数字显示 */}
                  <div className="flex justify-center gap-4">
                    {gameState.numbers.map((num, index) => (
                      <motion.div
                        key={index}
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className="w-20 h-20 rounded-lg bg-primary/10 flex items-center justify-center"
                      >
                        <span className="text-4xl font-bold text-primary">{num}</span>
                      </motion.div>
                    ))}
                  </div>

                  {/* 输入区 */}
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input
                        placeholder="输入表达式，如: (1+2)*3-4"
                        value={gameState.userInput}
                        onChange={(e) => setGameState(prev => ({ ...prev, userInput: e.target.value }))}
                        onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                        className="text-lg"
                        disabled={!gameState.isPlaying}
                      />
                      <Button onClick={handleSubmit} disabled={!gameState.isPlaying}>
                        提交
                      </Button>
                    </div>

                    {/* 快捷输入按钮 */}
                    <div className="flex flex-wrap gap-2">
                      {['+', '-', '*', '/', '(', ')'].map((op) => (
                        <Button
                          key={op}
                          variant="outline"
                          size="sm"
                          onClick={() => setGameState(prev => ({
                            ...prev,
                            userInput: prev.userInput + op
                          }))}
                          disabled={!gameState.isPlaying}
                        >
                          {op}
                        </Button>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setGameState(prev => ({
                          ...prev,
                          userInput: prev.userInput.slice(0, -1)
                        }))}
                        disabled={!gameState.isPlaying}
                      >
                        删除
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setGameState(prev => ({ ...prev, userInput: "" }))}
                        disabled={!gameState.isPlaying}
                      >
                        清空
                      </Button>
                    </div>
                  </div>

                  {/* 消息显示 */}
                  {gameState.message && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex items-center gap-2 p-4 rounded-lg ${
                        gameState.messageType === "success"
                          ? "bg-green-500/10 text-green-700 dark:text-green-300"
                          : gameState.messageType === "error"
                          ? "bg-red-500/10 text-red-700 dark:text-red-300"
                          : "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                      }`}
                    >
                      {gameState.messageType === "success" ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : gameState.messageType === "error" ? (
                        <XCircle className="h-5 w-5" />
                      ) : (
                        <Lightbulb className="h-5 w-5" />
                      )}
                      <span>{gameState.message}</span>
                    </motion.div>
                  )}

                  {/* 操作按钮 */}
                  {gameState.isPlaying && (
                    <div className="flex justify-center gap-3">
                      <Button
                        variant="ghost"
                        onClick={handleShowHint}
                        disabled={showHint}
                      >
                        <Lightbulb className="mr-2 h-4 w-4" />
                        {showHint ? "已显示提示" : "显示提示"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleNoSolution}
                        className="border-amber-500 text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        此题无解
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* 历史记录 */}
          {gameState.history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>历史记录</CardTitle>
                <CardDescription>最近10次尝试</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {gameState.history.map((record, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        {record.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <div>
                          <div className="text-sm font-medium">{record.expression}</div>
                          <div className="text-xs text-muted-foreground">
                            数字: {record.numbers.join(', ')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 侧边栏 */}
        <div className="space-y-6">
          {/* 统计 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                统计数据
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">已解决</span>
                <span className="text-2xl font-bold text-green-600">{gameState.solved}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">总尝试</span>
                <span className="text-2xl font-bold">{gameState.attempts}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">成功率</span>
                <span className="text-2xl font-bold text-primary">
                  {gameState.attempts > 0
                    ? Math.round((gameState.solved / gameState.attempts) * 100)
                    : 0}%
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 游戏规则 */}
          <Card>
            <CardHeader>
              <CardTitle>游戏规则</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium shrink-0">
                  1
                </div>
                <p>使用给定的4个数字（1-13之间）</p>
              </div>
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium shrink-0">
                  2
                </div>
                <p>通过 +、-、×、÷ 运算符计算</p>
              </div>
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium shrink-0">
                  3
                </div>
                <p>每个数字必须恰好使用一次</p>
              </div>
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium shrink-0">
                  4
                </div>
                <p>可以使用括号改变运算顺序</p>
              </div>
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium shrink-0">
                  5
                </div>
                <p>计算结果必须等于 24</p>
              </div>
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium shrink-0">
                  6
                </div>
                <p>除法支持分数运算（如 8/3 = 2.666...）</p>
              </div>
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium shrink-0">
                  7
                </div>
                <p>如判断题目无解，可点击"此题无解"按钮</p>
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
                <div className="font-medium mb-1">数字: 3, 3, 8, 8</div>
                <div className="text-muted-foreground">答案: 8/(3-8/3) = 24</div>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <div className="font-medium mb-1">数字: 2, 3, 5, 12</div>
                <div className="text-muted-foreground">答案: (12-2)*(5-3) = 24</div>
              </div>
              <div className="p-2 rounded bg-muted/50">
                <div className="font-medium mb-1">数字: 1, 5, 5, 5</div>
                <div className="text-muted-foreground">答案: 5*(5-1/5) = 24</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
