# Copyright 2025 Google LLC. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the 'License');
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an 'AS IS' BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Interface AI Agent handlers need to implement."""

from abc import ABC, abstractmethod
from typing import Any

class IAiAgentHandler(ABC):
    @abstractmethod
    def extract_content_from_input(self, input) -> dict:
        pass
    
    @abstractmethod
    def final_answer(self, author: str, text: str):
        pass

    @abstractmethod
    def function_calling_initiation(self, author: str, name: str) -> Any:
        pass

    @abstractmethod
    def function_calling_completion(self, author: str, name: str, response, output_id):
        pass
