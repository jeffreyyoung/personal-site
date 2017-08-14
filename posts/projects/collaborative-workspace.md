---
title: Adobe Garage Week Hackathon Finalist
image: static/collaboration-demo.gif
imageDescription: Demo of Analysis Workspace with Collaboration
category: projects
order: 2
description: During a week long hackathon consisting of the Adobe Analytics engineering organization, 2 coworkers and I added features to an existing product that was elected to be a finalist in the hackathon competition.  We eventually got to demo our app to the CEO of Adobe.
---

Last December Adobe had a week long hackathon where any engineer could build anything they wanted as long as whatever they built related to Adobe in some way.

I spend most of my time working on Analysis Workspace.  With AW users can create dashboards to view web traffic analytics.  One problem with Analysis Workspace is that only one user can edit a dashboard at a time.  If multiple users, logged in on different computers, edit the same dashboard, each user will be overriding the other users changes.

To address this problem, I decided I wanted to make Analysis Workspace like Google Docs, where when one user edits a dashboard, changes are pushed to all other users viewing the same dashboard. I posted the idea to the garageweek idea list and two coworkers decided to work with me.

### Technology Used
We create a node server with socket.io to send messages back and forth between users.

Since Analysis Workspace already records project changes for undo/redo functionality, we leveraged already written functionality to broadcast and replay changes. 