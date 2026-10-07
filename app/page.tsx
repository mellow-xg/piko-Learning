"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Shell } from "@/components/Shell";
import { StatCard } from "@/components/StatCard";
import { CourseCard } from "@/components/CourseCard";
import { AuthScreen } from "@/components/AuthScreen";

type Course = { id:string; title:string; slug:string; description:string|null; difficulty:string|null; thumbnail:string|null; };
type Profile = { full_name:string|null; username:string|null; level:number; total_xp:number; };

export default function Home() {
  const [session,setSession]=useState<any>(null), [profile,setProfile]=useState<Profile|null>(null);
  const [courses,setCourses]=useState<Course[]>([]), [progressCount,setProgressCount]=useState(0), [loading,setLoading]=useState(true);

  useEffect(() => {
    let active=true;
    supabase.auth.getSession().then(async ({data}) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) {
        const [{data:p},{data:c},{count}] = await Promise.all([
          supabase.from("profiles").select("full_name,username,level,total_xp").eq("id",data.session.user.id).single(),
          supabase.from("courses").select("id,title,slug,description,difficulty,thumbnail").eq("status","published").order("created_at",{ascending:false}).limit(6),
          supabase.from("progress").select("id",{count:"exact",head:true}).eq("user_id",data.session.user.id).eq("completed",true)
        ]);
        if (active) { setProfile(p); setCourses(c||[]); setProgressCount(count||0); }
      }
      setLoading(false);
    });
    const {data:sub}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));
    return ()=>{active=false;sub.subscription.unsubscribe();};
  },[]);

  if (loading) return <div className="screen-center"><div className="spinner"/><span>Loading Piko…</span></div>;
  if (!session) return <AuthScreen />;

  const name=profile?.full_name || profile?.username || session.user.email?.split("@")[0] || "Learner";
  const xp=profile?.total_xp||0, level=profile?.level||1;
  const thresholds=[0,100,250,500,850], current=thresholds[Math.min(level-1,4)], next=thresholds[level] ?? 1000;
  const levelProgress=Math.min(100,Math.round(((xp-current)/Math.max(1,next-current))*100));

  return <Shell active="home">
    <section className="hero"><div><p className="eyebrow">GOOD TO SEE YOU</p><h1>Hey, {name.split(" ")[0]} 👋</h1><p className="muted">Ready to level up today?</p></div><div className="level-badge">LVL {level}<strong>{xp} XP</strong></div></section>
    <div className="xp-track"><div style={{width:levelProgress+"%"}}/></div>
    <div className="xp-label"><span>{Math.max(0,xp-current)}/{Math.max(1,next-current)} XP to Level {level+1}</span><span>📚 {progressCount} lessons complete</span></div>
    <div className="stats-grid"><StatCard icon="⚡" label="Total XP" value={String(xp)} /><StatCard icon="📚" label="Lessons" value={String(progressCount)} /><StatCard icon="🎯" label="Daily Goal" value="0 / 20 min" /></div>
    <section className="section"><div className="section-head"><div><p className="eyebrow">KEEP GOING</p><h2>Continue learning</h2></div><a href="/learn">See all</a></div>
      {courses.length ? <div className="course-grid">{courses.slice(0,2).map(c=><CourseCard key={c.id} course={c}/>)}</div> : <div className="empty-card"><span>📚</span><h3>Your learning path starts here</h3><p>Publish your first course and it will appear here.</p></div>}
    </section>
    <section className="section"><div className="section-head"><div><p className="eyebrow">TODAY</p><h2>Daily goal</h2></div></div><div className="mission-card"><div className="mission-icon">🎯</div><div><h3>Complete 20 minutes of learning</h3><p>Daily missions, streaks and rewards are coming in Phase 2.</p></div><span className="pill">20 min</span></div></section>
  </Shell>;
}