"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Shell } from "@/components/Shell";
import { StatCard } from "@/components/StatCard";
import { CourseCard } from "@/components/CourseCard";
import { AuthScreen } from "@/components/AuthScreen";

type Course = { id:string; title:string; slug:string; description:string|null; difficulty:string|null; thumbnail:string|null; };
type Profile = { full_name:string|null; username:string|null; level:number; total_xp:number; streak:number; };

export default function Home() {
  const [session,setSession] = useState<any>(null);
  const [profile,setProfile] = useState<Profile|null>(null);
  const [courses,setCourses] = useState<Course[]>([]);
  const [loading,setLoading] = useState(true);

  useEffect(() => {
    let active=true;
    supabase.auth.getSession().then(async ({data}) => {
      if (!active) return;
      setSession(data.session);
      if (data.session) {
        const [{data: p},{data:c}] = await Promise.all([
          supabase.from("profiles").select("full_name,username,level,total_xp,streak").eq("id",data.session.user.id).single(),
          supabase.from("courses").select("id,title,slug,description,difficulty,thumbnail").eq("status","published").order("created_at",{ascending:false}).limit(6)
        ]);
        if (active) { setProfile(p); setCourses(c||[]); }
      }
      setLoading(false);
    });
    const {data: sub}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));
    return ()=>{active=false;sub.subscription.unsubscribe();};
  },[]);

  if (loading) return <div className="screen-center"><div className="spinner"/><span>Loading Piko…</span></div>;
  if (!session) return <AuthScreen />;

  const name=profile?.full_name || profile?.username || session.user.email?.split("@")[0] || "Learner";
  const xp=profile?.total_xp||0;
  const level=profile?.level||1;
  const xpInLevel=xp%100;

  return <Shell active="home">
    <section className="hero">
      <div><p className="eyebrow">GOOD TO SEE YOU</p><h1>Hey, {name.split(" ")[0]} 👋</h1><p className="muted">Ready to level up today?</p></div>
      <div className="level-badge">LVL {level}<strong>{xp} XP</strong></div>
    </section>

    <div className="xp-track"><div style={{width:`${xpInLevel}%`}}/></div>
    <div className="xp-label"><span>{xpInLevel}/100 XP to Level {level+1}</span><span>🔥 {profile?.streak||0} day streak</span></div>

    <div className="stats-grid">
      <StatCard icon="⚡" label="Total XP" value={String(xp)} />
      <StatCard icon="🔥" label="Streak" value={`${profile?.streak||0} days`} />
      <StatCard icon="🎯" label="Daily Goal" value="0 / 50 XP" />
    </div>

    <section className="section"><div className="section-head"><div><p className="eyebrow">KEEP GOING</p><h2>Continue learning</h2></div><a href="/learn">See all</a></div>
      {courses.length ? <div className="course-grid">{courses.slice(0,2).map(c=><CourseCard key={c.id} course={c}/>)}</div> :
      <div className="empty-card"><span>📚</span><h3>Your learning path starts here</h3><p>Add your first published course from the admin tools.</p></div>}
    </section>

    <section className="section"><div className="section-head"><div><p className="eyebrow">TODAY</p><h2>Daily mission</h2></div></div>
      <div className="mission-card"><div className="mission-icon">🎯</div><div><h3>Earn 50 XP today</h3><p>Complete lessons and challenges to reach your daily goal.</p></div><span className="pill">+25 XP</span></div>
    </section>
  </Shell>;
}