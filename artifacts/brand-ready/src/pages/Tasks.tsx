import { useState, useMemo } from "react";
import { useRoute } from "wouter";
import { Link } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { 
  useListAnalysisTasks, 
  getListAnalysisTasksQueryKey,
  useCompleteTask,
  useUncompleteTask,
  useGetAnalysis,
  getGetAnalysisQueryKey
} from "@workspace/api-client-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Flag, CheckCircle2, Clock, CalendarDays, Loader2 } from "lucide-react";

export default function Tasks() {
  const [, params] = useRoute("/tasks/:analysisId");
  const analysisId = params?.analysisId ? parseInt(params.analysisId, 10) : 0;
  const queryClient = useQueryClient();
  
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const { data: analysisData } = useGetAnalysis(analysisId, {
    query: {
      enabled: !!analysisId,
      queryKey: getGetAnalysisQueryKey(analysisId)
    }
  });

  const { data: tasksData, isLoading } = useListAnalysisTasks(analysisId, {
    query: {
      enabled: !!analysisId,
      queryKey: getListAnalysisTasksQueryKey(analysisId)
    }
  });

  const completeTaskMutation = useCompleteTask();
  const uncompleteTaskMutation = useUncompleteTask();

  const handleToggleTask = async (taskId: number, currentStatus: boolean) => {
    try {
      if (currentStatus) {
        await uncompleteTaskMutation.mutateAsync({ id: taskId });
      } else {
        await completeTaskMutation.mutateAsync({ id: taskId });
      }
      queryClient.invalidateQueries({ queryKey: getListAnalysisTasksQueryKey(analysisId) });
    } catch (error) {
      console.error("Failed to toggle task", error);
    }
  };

  const tasks = (tasksData as any)?.data || tasksData || [];
  const analysis = (analysisData as any)?.data || analysisData;

  const groupedTasks = useMemo(() => {
    const groups: Record<string, any[]> = {};
    tasks.forEach((task: any) => {
      if (!groups[task.category]) {
        groups[task.category] = [];
      }
      groups[task.category].push(task);
    });
    return groups;
  }, [tasks]);

  const categories = Object.keys(groupedTasks);
  const currentCategory = activeCategory || (categories.length > 0 ? categories[0] : null);
  
  const currentTasks = currentCategory ? groupedTasks[currentCategory] : [];
  currentTasks.sort((a, b) => a.priority - b.priority);

  const completedCount = tasks.filter((t: any) => t.isCompleted).length;
  const progressPercent = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 flex flex-col h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="flex-shrink-0 mb-6">
          <Link href={`/results/${analysisId}`}>
            <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-muted-foreground">
              <ChevronLeft className="h-4 w-4 mr-1" /> Back to Results
            </Button>
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Action Plan</h1>
              <p className="text-muted-foreground mt-1">
                {analysis?.brandName ? `For ${analysis.brandName}` : "Complete these tasks to become ad-ready."}
              </p>
            </div>
            
            <div className="w-full md:w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-muted-foreground">Overall Progress</span>
                <span className="font-bold">{Math.round(progressPercent)}%</span>
              </div>
              <Progress value={progressPercent} className="h-2.5" />
              <p className="text-xs text-right text-muted-foreground">
                {completedCount} of {tasks.length} tasks completed
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
          {/* Sidebar / Categories */}
          <div className="w-full md:w-64 flex-shrink-0 flex flex-col gap-2">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2">Categories</h3>
            <div className="flex flex-row md:flex-col gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
              {categories.map((cat) => {
                const catTasks = groupedTasks[cat];
                const catCompleted = catTasks.filter((t: any) => t.isCompleted).length;
                const isDone = catCompleted === catTasks.length;
                const isSelected = currentCategory === cat;
                
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`flex-shrink-0 flex items-center justify-between text-left px-4 py-3 rounded-lg text-sm transition-colors border ${
                      isSelected 
                        ? "bg-primary text-primary-foreground border-primary font-medium shadow-sm" 
                        : "bg-card hover:bg-muted/50 border-transparent hover:border-border"
                    }`}
                  >
                    <span className="capitalize">{cat.replace('_', ' ')}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${isSelected ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                        {catCompleted}/{catTasks.length}
                      </span>
                      {isDone && <CheckCircle2 className={`h-4 w-4 ${isSelected ? "text-primary-foreground" : "text-green-500"}`} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Task List */}
          <div className="flex-1 bg-card border rounded-xl shadow-sm flex flex-col min-h-0 overflow-hidden">
            <div className="p-4 border-b bg-muted/20 flex justify-between items-center">
              <h2 className="font-semibold capitalize text-lg flex items-center gap-2">
                <Flag className="h-5 w-5 text-primary" />
                {currentCategory?.replace('_', ' ')} Tasks
              </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {currentTasks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No tasks in this category.
                </div>
              ) : (
                currentTasks.map((task: any) => {
                  const isWorking = completeTaskMutation.isPending || uncompleteTaskMutation.isPending;
                  
                  return (
                    <div 
                      key={task.id} 
                      className={`flex gap-4 p-4 rounded-lg border transition-all ${
                        task.isCompleted ? "bg-muted/30 border-muted opacity-60" : "bg-background border-border hover:border-primary/30 hover:shadow-sm"
                      }`}
                    >
                      <div className="pt-1">
                        <Checkbox 
                          checked={task.isCompleted} 
                          onCheckedChange={() => handleToggleTask(task.id, task.isCompleted)}
                          disabled={isWorking}
                          className="h-5 w-5"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-wrap gap-2 items-center mb-1">
                          <h4 className={`font-semibold ${task.isCompleted ? "line-through text-muted-foreground" : ""}`}>
                            {task.title}
                          </h4>
                          {!task.isCompleted && task.priority === 1 && (
                            <Badge variant="destructive" className="h-5 px-1.5 text-[10px] uppercase font-bold">High Priority</Badge>
                          )}
                        </div>
                        <p className={`text-sm mb-3 ${task.isCompleted ? "text-muted-foreground" : "text-foreground/80"} leading-relaxed`}>
                          {task.description}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {task.estimatedDays} days est.
                          </span>
                          {task.isDailyTask && (
                            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                              <CalendarDays className="h-3 w-3" />
                              Daily Routine
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}