import { LINDA_JOHNSON_PROMPT } from './prompts/linda_johnson';
import { DAVID_RODRIGUEZ_PROMPT } from './prompts/david_rodriguez';
import { SARAH_LEE_PROMPT } from './prompts/sarah_lee';
import { JAMES_THOMPSON_PROMPT } from './prompts/james_thompson';
import { EMILY_CARTER_PROMPT } from './prompts/emily_carter';

export const MODEL = "gpt-4o";

export interface Character {
  name: string;
  title: string;
  prompt: string;
  greeting: string;
}

export const CHARACTERS: Record<string, Character> = {
  emily_carter: {
    name: "Dr. Emily Carter",
    title: "Superintendent",
    greeting: "Hello, I'm Dr. Emily Carter, Superintendent of BMSD. I'm committed to finding sustainable solutions to our transportation crisis while maintaining our district's commitment to educational equity. I'm here to discuss our challenges and explore potential paths forward.",
    prompt: EMILY_CARTER_PROMPT
  },
  linda_johnson: {
    name: "Ms. Linda Johnson",
    title: "Bus Driver",
    greeting: "Hello, I'm Ms. Linda Johnson, a bus driver with over 20 years of experience at BMSD. I've seen a lot of changes in our transportation system over the years, and I'm here to share my perspective on the current challenges we're facing.",
    prompt: LINDA_JOHNSON_PROMPT
  },
  david_rodriguez: {
    name: "Mr. David Rodriguez",
    title: "Principal of Osprey Gardens K-8",
    greeting: "Hello, I'm Mr. David Rodriguez, Principal of Osprey Gardens K-8. I'm deeply concerned about how our transportation challenges are affecting our students, particularly those from disadvantaged backgrounds. I'm here to discuss the impact on our school community and advocate for equitable solutions.",
    prompt: DAVID_RODRIGUEZ_PROMPT
  },
  sarah_lee: {
    name: "Ms. Sarah Lee",
    title: "Chief Operations Officer",
    greeting: "Hello, I'm Sarah Lee, Chief Operations Officer of BMSD. I'm leading our efforts to optimize our transportation system and implement new solutions. I'm here to discuss our operational challenges and the initiatives we're exploring to address them.",
    prompt: SARAH_LEE_PROMPT
  },
  james_thompson: {
    name: "Mr. James Thompson",
    title: "Chief Financial Officer",
    greeting: "Hello, I'm James Thompson, CFO of BMSD. I'm responsible for managing our district's finances and understanding the full scope of our transportation budget crisis. I'm here to provide insights into our financial situation and discuss potential solutions.",
    prompt: JAMES_THOMPSON_PROMPT
  }
};

export const defaultVectorStore = {
  id: "",
  name: "Example",
};
