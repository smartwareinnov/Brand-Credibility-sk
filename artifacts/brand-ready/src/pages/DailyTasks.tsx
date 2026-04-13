import { useState } from "react";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/hooks/useSession";
import {
  useGetRecentAnalyses, getGetRecentAnalysesQueryKey,
  useListAnalysisTasks, getListAnalysisTasksQueryKey,
  useCompleteTask, useUncompleteTask,
} from "@workspace/api-client-react";
import {
  CalendarCheck, CheckCircle2, Circle, Clock, Flag, Zap,
  TrendingUp, AlertTriangle, ChevronRight, RotateCcw,
} from "lucide-react";

const PRIORITY_STYLES: Record<string, { badge: string; label: string; icon: React.ElementType }> = {
  high: { badge: "bg-red-100 text-red-700 border-red-200", label: "High", icon: Flag },
  medium: { badge: "bg-amber-100 text-amber-700 border-amber-200", label: "Medium", icon: Clock },
  low: { badge: "bg-blue-100 text-blue-700 border-blue-200", label: "Low", icon: TrendingUp },
};

function TaskRow({ task, onToggle, isToggling }: {
  task: { id: number; title: string; description: string; priority: string; completed: boolean; category: string; dayNumber: number };
  onToggle: (id: number, completed: boolean) => void;
  isToggling: boolean;
}) {
  const priority = PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.medium;
  const PriorityIcon = priority.icon;

  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border transition-colors
      ${task.completed ? "bg-muted/40 border-muted" : "bg-card border-border hover:border-primary/30"}`}>
      <Checkbox
        id={`task-${task.id}`}
        checked={task.completed}
        onCheckedChange={() => onToggle(task.id, task.completed)}
        disabled={isToggling}
        className="mt-0.5 flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <label
          htmlFor={`task-${task.id}`}
          className={`text-sm font-medium block cursor-pointer leading-snug ${task.completed ? "line-through text-muted-foreground" : ""}`}
        >
          {task.title}
        </label>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">{task.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge variant="outline" className={`text-xs gap-1 ${priority.badge}`}>
            <PriorityIcon className="h-3 w-3" />
            {priority.label}
          </Badge>
          <Badge variant="secondary" className="text-xs">{task.category}</Badge>
          <span className="text-xs text-muted-foreground">Day {task.dayNumber}</span>
        </div>
      </div>
      {task.completed && (
        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
      )}
    </div>
  );
}

export default function DailyTasks() {
  const sessionId = useSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const { data: recentAnalyses, isLoading: loadingAnalyses } = useGetRecentAnalyses({
    query: { queryKey: getGetRecentAnalysesQueryKey(), retry: false },
    request: sessionId ? { headers: { "x-session-id": sessionId } } : undefined,
  });

  const analyses = (recentAnalyses as unknown as Record<string, unknown>)?.data as Array<{ id: number; brandName: string; score: number }> ??
    (Array.isArray(recentAnalyses) ? recentAnalyses : []);

  const latestAnalysis = analyses[0];
  const analysisId = latestAnalysis?.id ?? 0;

  const { data: tasksData, isLoading: loadingTasks } = useListAnalysisTasks(analysisId, {
    query: {
      enabled: !!analysisId,
      queryKey: getListAnalysisTasksQueryKey(analysisId),
    },
    request: sessionId ? { headers: { "x-session-id": sessionId } } : undefined,
  });

  const completeTask = useCompleteTask({
    request: sessionId ? { headers: { "x-session-id": sessionId } } : undefined,
  });
  const uncompleteTask = useUncompleteTask({
    request: sessionId ? { headers: { "x-session-id": sessionId } } : undefined,
  });

  const allTasks = ((tasksData as unknown as Record<string, unknown>)?.data as Array<Record<string, unknown>> ?? (Array.isArray(tasksData) ? tasksData : [])) as Array<{
    id: number; title: string; description: string; priority: string;
    completed: boolean; category: string; dayNumber: number;
  }>;

  const today = new Date();
  const dayOfPlan = Math.max(1, Math.min(30, Math.ceil((today.getTime() - (today.getTime() % (30 * 24 * 60 * 60 * 1000))) / (24 * 60 * 60 * 1000) % 30 + 1)));

  const todayTasks = allTasks.filter(t => t.dayNumber === dayOfPlan || t.dayNumber === dayOfPlan - 1);
  const overdueTasks = allTasks.filter(t => t.dayNumber < dayOfPlan - 1 && !t.completed);
  const completedToday = todayTasks.filter(t => t.completed).length;
  const totalToday = todayTasks.length;
  const progress = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

  const handleToggle = async (id: number, completed: boolean) => {
    setTogglingId(id);
    try {
      if (completed) {
        await uncompleteTask.mutateAsync({ id });
        toast({ title: "Task marked incomplete" });
      } else {
        await completeTask.mutateAsync({ id });
        toast({ title: "Task completed! 🎉", description: "Keep up the momentum." });
      }
      queryClient.invalidateQueries({ queryKey: getListAnalysisTasksQueryKey(analysisId) });
    } catch {
      toast({ title: "Error", description: "Failed to update task.", variant: "destructive" });
    } finally {
      setTogglingId(null);
    }
  };

  const isLoading = loadingAnalyses || (!!analysisId && loadingTasks);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-32 bg-muted/40 animate-pulse rounded-xl" />
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      </DashboardLayout>
    );
  }

  if (!latestAnalysis) {
    return (
      <DashboardLayout>
        <div className="p-4 sm:p-6 max-w-3xl mx-auto">
          <div className="text-center py-16">
            <CalendarCheck className="h-14 w-14 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">No tasks yet</h2>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
              Run your first brand analysis to get a personalised 30-day action plan with daily tasks
            </p>
            <Link href="/analyze">
              <Button className="gap-1.5">
                <Zap className="h-4 w-4" /> Start Analysis
              </Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarCheck className="h-6 w-6 text-primary" /> Daily Tasks
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Your personalised action items for{" "}
            <span className="font-semibold text-foreground">{latestAnalysis.brandName}</span> — Day {dayOfPlan} of 30
          </p>
        </div>

        {/* Progress Banner */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-semibold text-sm">Today's Progress</p>
                <p className="text-xs text-muted-foreground">
                  {completedToday} of {totalToday} tasks completed
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-extrabold text-primary">{progress}%</p>
                <p className="text-xs text-muted-foreground">done today</p>
              </div>
            </div>
            <Progress value={progress} className="h-2" />
            {progress === 100 && totalToday > 0 && (
              <div className="flex items-center gap-2 mt-3 text-green-700 text-sm font-medium">
                <CheckCircle2 className="h-4 w-4" />
                All done for today! Great work.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Overdue Alert */}
        {overdueTasks.length > 0 && (
          <Alert className="border-amber-300 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-xs text-amber-700">
              You have <strong>{overdueTasks.length} overdue task{overdueTasks.length !== 1 ? "s" : ""}</strong> from previous days.
              Complete them below or view your full plan.
            </AlertDescription>
          </Alert>
        )}

        {/* Today's Tasks */}
        {todayTasks.length > 0 ? (
          <div className="space-y-3">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Today — Day {dayOfPlan}
            </h2>
            {todayTasks.map((task) => (
              <TaskRow
                key={task.id} task={task}
                onToggle={handleToggle}
                isToggling={togglingId === task.id}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-10 text-center">
              <Circle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="font-medium mb-1">No tasks scheduled for today</p>
              <p className="text-sm text-muted-foreground">Check back tomorrow for your next set of tasks</p>
            </CardContent>
          </Card>
        )}

        {/* Overdue Tasks */}
        {overdueTasks.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-sm text-amber-700 uppercase tracking-wide flex items-center gap-2">
              <RotateCcw className="h-3.5 w-3.5" /> Overdue
            </h2>
            {overdueTasks.slice(0, 5).map((task) => (
              <TaskRow
                key={task.id} task={task}
                onToggle={handleToggle}
                isToggling={togglingId === task.id}
              />
            ))}
          </div>
        )}

        {/* View Full Plan */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            {allTasks.filter(t => t.completed).length} of {allTasks.length} total tasks completed
          </p>
          <Link href={`/tasks/${analysisId}`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              View Full 30-Day Plan <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* Overall progress bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">30-Day Plan Progress</span>
              <span className="text-muted-foreground">
                {allTasks.filter(t => t.completed).length}/{allTasks.length}
              </span>
            </div>
            <Progress
              value={allTasks.length > 0 ? (allTasks.filter(t => t.completed).length / allTasks.length) * 100 : 0}
              className="h-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              {30 - dayOfPlan} days remaining in your plan
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
