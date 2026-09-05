"use client";

// ゲーム詳細ページのタブ（クリップ / メンバー募集）

import { useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import type { ClipWithGame, RecruitWithGame } from "@/lib/types";
import { ClipGrid } from "./ClipGrid";
import { RecruitCard } from "./RecruitCard";

interface Props {
  clips: ClipWithGame[];
  recruits: RecruitWithGame[];
}

function TabPanel({ active, children }: { active: boolean; children: ReactNode }) {
  if (!active) return null;
  return <Box sx={{ pt: 3 }}>{children}</Box>;
}

export function GameTabs({ clips, recruits }: Props) {
  const [tab, setTab] = useState(0);

  return (
    <>
      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label={`クリップ (${clips.length})`} />
        <Tab label={`メンバー募集 (${recruits.length})`} />
      </Tabs>
      <TabPanel active={tab === 0}>
        <ClipGrid clips={clips} />
      </TabPanel>
      <TabPanel active={tab === 1}>
        <Stack spacing={2}>
          {recruits.map((recruit) => (
            <RecruitCard key={recruit.id} recruit={recruit} />
          ))}
        </Stack>
      </TabPanel>
    </>
  );
}
