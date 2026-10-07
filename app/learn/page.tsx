"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Shell } from "@/components/Shell";
import { CourseCard } from "@/components/CourseCard";
import { AuthScreen } from "@/components/AuthScreen";

export default function Learn() {
  const [session, setSession] = useState<any>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      setSession(s.session);
      const userId = s.session?.user?.id;
      if (!userId) { setLoading(false); return; }

      const { data: c } = await supabase.from("courses").select("id,title,slug,description,difficulty,thumbnail").eq("status", "published").order("created_at", { ascending: false });
      const ids = (c ?? []).map((x: any) => x.id);
      const { data: allLessonsRaw } = ids.length
        ? await supabase.from("lessons").select("id,chapters!inner(course_id)").in("chapters.course_id", ids)
        : { data: [] as any[] };
      const allLessons: any[] = allLessonsRaw ?? [];
      const { data: p } = allLessons.length
        ? await supabase.from("progress").select("lesson_id").eq("user_id", userId).eq("completed", true).in("lesson_id", allLessons.map((x: any) => x.id))
        : { data: [] as any[] };

      const done = new Set((p ?? []).map((x: any) => x.lesson_id));
      const totals = new Map<string, number>();
      const completed = new Map<string, number>();
      allLessons.forEach((lesson: any) => {
        const cid = lesson?.chapters?.course_id;
        if (!cid) return;
        totals.set(cid, (totals.get(cid) ?? 0) + 1);
        if (done.has(lesson.id)) completed.set(cid, (completed.get(cid) ?? 0) + 1);
      });

      setCourses((c ?? []).map((course: any) => {
        const total = totals.get(course.id) ?? 0;
        const doneCount = completed.get(course.id) ?? 0;
        return { ...course, progress: total > 0 ? Math.round((doneCount / total) * 100) : 0 };
      }));
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="screen-center"><div className="spinner" /></div>;
  if (!session) return <AuthScreen />;
  return <Shell active="learn"><div className="page-head"><p className="eyebrow">LEARNING PATH</p><h1>Choose your next level</h1><p className="muted">Pick a course and start earning XP.</p></div><div className="course-grid">{courses.map((course) => <CourseCard key={course.id} course={course} />)}</div>{!courses.length && <div className="empty-card"><span>🧭</span><h3>No courses yet</h3><p>Publish a course in Supabase and it will appear here.</p></div>}</Shell>;
}
