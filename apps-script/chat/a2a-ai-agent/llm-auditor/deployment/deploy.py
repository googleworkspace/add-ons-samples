# Copyright 2025 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Deployment script for LLM Auditor."""

import os

from absl import app
from absl import flags
from dotenv import load_dotenv
from llm_auditor.agent import root_agent
import vertexai
from vertexai import agent_engines

# A2A wrapping
from a2a.types import AgentSkill
from google.adk.a2a.executor.a2a_agent_executor import A2aAgentExecutor
from google.adk.runners import InMemoryRunner
from vertexai.preview.reasoning_engines.templates.a2a import create_agent_card
from vertexai.preview.reasoning_engines import A2aAgent

FLAGS = flags.FLAGS
flags.DEFINE_string("project_id", None, "GCP project ID.")
flags.DEFINE_string("location", None, "GCP location.")
flags.DEFINE_string("bucket", None, "GCP bucket.")
flags.DEFINE_string("resource_id", None, "ReasoningEngine resource ID.")

flags.DEFINE_bool("list", False, "List all agents.")
flags.DEFINE_bool("create", False, "Creates a new agent.")
flags.DEFINE_bool("delete", False, "Deletes an existing agent.")
flags.mark_bool_flags_as_mutual_exclusive(["create", "delete"])


def create() -> None:
    """Creates an agent engine for LLM Auditor."""
    agent_card = create_agent_card(
        agent_name=root_agent.name,
        description=root_agent.description,
        skills=[AgentSkill(
            id='audit_llm_output',
            name='Audit LLM Output',
            description='Critiques and revises outputs from large language models.',
            tags=['LLM', 'Audit', 'Revision'],
            examples=[
                'The earth is flat.',
                'The capital of France is Berlin.',
                'The last winner of the Super Bowl was the New England Patriots in 2020.',
            ],
        )]
    )
    a2a_agent = A2aAgent(
        agent_card=agent_card,
        agent_executor_builder=lambda: A2aAgentExecutor(
            runner=InMemoryRunner(
                app_name=root_agent.name,
                agent=root_agent,
            )
        )
    )
    a2a_agent.set_up()
    
    remote_agent = agent_engines.create(
        a2a_agent,
        display_name=root_agent.name,
        requirements=[
                "google-adk (>=0.0.2)",
                "google-cloud-aiplatform[agent_engines] (>=1.88.0,<2.0.0)",
                "google-genai (>=1.5.0,<2.0.0)",
                "pydantic (>=2.10.6,<3.0.0)",
                "absl-py (>=2.2.1,<3.0.0)",
                "a2a-sdk>=0.3.22",
                "uvicorn",
        ],
        # In-memory runner
        max_instances=1,
        env_vars ={
            "NUM_WORKERS": "1"
        },
        extra_packages=["./llm_auditor"],
    )
    print(f"Created remote agent: {remote_agent.resource_name}")


def delete(resource_id: str) -> None:
    remote_agent = agent_engines.get(resource_id)
    remote_agent.delete(force=True)
    print(f"Deleted remote agent: {resource_id}")


def list_agents() -> None:
    remote_agents = agent_engines.list()
    TEMPLATE = '''
{agent.name} ("{agent.display_name}")
- Create time: {agent.create_time}
- Update time: {agent.update_time}
'''
    remote_agents_string = '\n'.join(TEMPLATE.format(agent=agent) for agent in remote_agents)
    print(f"All remote agents:\n{remote_agents_string}")

def main(argv: list[str]) -> None:
    del argv  # unused
    load_dotenv()

    project_id = (
        FLAGS.project_id
        if FLAGS.project_id
        else os.getenv("GOOGLE_CLOUD_PROJECT")
    )
    location = (
        FLAGS.location if FLAGS.location else os.getenv("GOOGLE_CLOUD_LOCATION")
    )
    bucket = (
        FLAGS.bucket if FLAGS.bucket
        else os.getenv("GOOGLE_CLOUD_STORAGE_BUCKET")
    )

    print(f"PROJECT: {project_id}")
    print(f"LOCATION: {location}")
    print(f"BUCKET: {bucket}")

    if not project_id:
        print("Missing required environment variable: GOOGLE_CLOUD_PROJECT")
        return
    elif not location:
        print("Missing required environment variable: GOOGLE_CLOUD_LOCATION")
        return
    elif not bucket:
        print(
            "Missing required environment variable: GOOGLE_CLOUD_STORAGE_BUCKET"
        )
        return

    vertexai.init(
        project=project_id,
        location=location,
        staging_bucket=f"gs://{bucket}",
    )

    if FLAGS.list:
        list_agents()
    elif FLAGS.create:
        create()
    elif FLAGS.delete:
        if not FLAGS.resource_id:
            print("resource_id is required for delete")
            return
        delete(FLAGS.resource_id)
    else:
        print("Unknown command")


if __name__ == "__main__":
    app.run(main)
