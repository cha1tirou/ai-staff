import asyncio
import os
from fastapi import FastAPI, HTTPException, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
from claude_agent_sdk import query, ClaudeAgentOptions, AgentDefinition

app = FastAPI()

INTERNAL_SECRET = os.environ.get("INTERNAL_SECRET", "")

# リクエスト型
class SubAgent(BaseModel):
    name: str
    role: str
    tasks: list[str]
    custom_tasks: str = ""

class RunRequest(BaseModel):
    message: str
    biz_name: str
    sub_agents: list[SubAgent]

def build_orchestrator_prompt(biz_name: str, sub_agents: list[SubAgent]) -> str:
    staff_list = "\n".join([
        f"- {a.name}（{a.role}）: {', '.join(a.tasks)}"
        for a in sub_agents
    ])
    return f"""あなたは{biz_name}のAIスタッフを束ねるマネージャーです。

【管理下のスタッフ】
{staff_list}

【あなたの役割】
- ユーザーの指示を受け取り、最適なスタッフに振り分ける
- 複数スタッフにまたがる場合は順番に依頼してまとめる
- どのスタッフにも該当しない場合は自分で対応する
- 必ず日本語で返答する
- スタッフに振った場合は「○○に確認しました」と透明性高く伝える"""

def build_sub_agent_definition(agent: SubAgent) -> AgentDefinition:
    task_list = "\n- ".join(filter(None, agent.tasks + [agent.custom_tasks]))
    return AgentDefinition(
        description=f"{agent.role}の専門エージェント。{', '.join(agent.tasks)}に関するタスクを担当。",
        prompt=f"""あなたは{agent.name}として働くAIスタッフです。

【担当業務】
- {task_list}

【ルール】
- 担当業務に関する質問・タスクに専門的に答える
- 簡潔かつ具体的に回答する
- 日本語で答える""",
        model="sonnet",
    )

@app.post("/run")
async def run_agent(
    req: RunRequest,
    x_internal_secret: Optional[str] = Header(None)
):
    # 認証
    if INTERNAL_SECRET and x_internal_secret != INTERNAL_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")

    if not req.sub_agents:
        raise HTTPException(status_code=400, detail="sub_agents is required")

    # サブエージェント定義を構築
    agents = {
        agent.name: build_sub_agent_definition(agent)
        for agent in req.sub_agents
    }

    # オーケストレータープロンプト
    orch_prompt = build_orchestrator_prompt(req.biz_name, req.sub_agents)

    # SSEストリームで返す
    async def stream():
        try:
            async for message in query(
                prompt=req.message,
                options=ClaudeAgentOptions(
                    system_prompt=orch_prompt,
                    allowed_tools=["Agent"],  # サブエージェント呼び出しのみ許可
                    agents=agents,
                    permission_mode="bypassPermissions",
                ),
            ):
                # ResultMessageの場合は最終結果
                if hasattr(message, "result") and message.result:
                    yield f"data: {message.result}\n\n"
                # AssistantMessageのテキストを流す
                elif hasattr(message, "message"):
                    for block in getattr(message.message, "content", []):
                        if getattr(block, "type", None) == "text" and block.text:
                            yield f"data: {block.text}\n\n"
        except Exception as e:
            yield f"data: [ERROR] {str(e)}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")

@app.get("/health")
def health():
    return {"status": "ok"}
