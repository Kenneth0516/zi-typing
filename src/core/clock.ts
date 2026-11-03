/** Monotonic clock. Snapshot stores elapsed time, never a prior process's performance.now(). */
export class PracticeClock {
  private accumulated=0;
  private since:number|null=null;
  constructor(private now:()=>number=()=>performance.now(), initial=0) { this.accumulated=initial; }
  start(){if(this.since===null) this.since=this.now();}
  pause(){if(this.since!==null){this.accumulated+=Math.max(0,this.now()-this.since);this.since=null;}}
  elapsed(){return this.accumulated+(this.since===null?0:Math.max(0,this.now()-this.since));}
  running(){return this.since!==null;}
}
