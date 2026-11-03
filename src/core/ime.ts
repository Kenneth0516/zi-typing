export type InputCommit={value:string;inputType:string};
/** Browser owns the editor. A composition end is settled after the final input
 * event, regardless of whether that input happens before or after compositionend.
 * flush() reads the DOM afresh and value deduplication makes both orders idempotent. */
export class IMEController {
  composing=false; settling=false; private last=''; private type='insertText';
  constructor(private read:()=>string,private commit:(event:InputCommit)=>void, initial=''){this.last=initial;}
  start(){this.composing=true;this.settling=false;}
  update() { /* No committed state changes during composition. */ }
  end(){this.composing=false;this.settling=true;}
  before(inputType:string){this.type=inputType||'insertText';}
  input(isComposing=false){if(this.composing||isComposing||this.settling)return;this.flush();}
  flush(){if(this.composing)return;this.settling=false;const value=this.read();if(value===this.last)return;this.last=value;this.commit({value,inputType:this.type});}
  reset(value=''){this.last=value;this.composing=false;this.settling=false;}
}
