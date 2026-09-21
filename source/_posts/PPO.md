# PPO

>近端策略优化（PPO，Proximal Policy Optimization）是强化学习中一种广泛使用且高效的策略梯度方法。本文档旨在对 PPO 的数学推导、核心思想及其 PyTorch 实现进行全面而详细的解释，帮助读者深入理解 PPO 的工作原理和实现细节。

---

## 目录

- 0. 问题设定与记号
  - 0.1 对策略目标 $J(\theta)$ 的解释
  - 0.2 对 $p_\theta(\tau)$ 的解释
- 1. 对 $J(\theta)$ 求导
  - 1.5. 一个关键恒等式
- 2. 用逐步奖励 $R_t$ 替换轨迹总奖励 $R(\tau)$（只用未来奖励）
  - 2.5. 价值函数
    - 2.5.1. 状态价值函数
    - 2.5.2. 动作价值函数
- 3. 用优势函数 $A_t$ 替换逐步回报 $R_t$（引入baseline减少方差）
- 4. Actor - Critic 网络
  - 4.5. 对经典目标函数做变换
- 5. 重要性采样
  - 5.1. 问题背景
  - 5.2. 重要性采样原理
  - 5.3. surrogate objective 的提出
  - 5.4. surrogate objective 的一阶一致性
- 6. 信赖域思想（TRPO）
- 7. 裁剪思想（PPO）与最终损失
- 8. 估计方法
  - 8.1. 估计 $\hat A_t$
    - 8.1.1. 单步 TD 残差（1-step TD）
    - 8.1.2. 蒙特卡洛回报（full return）
    - 8.1.3. GAE（Generalized Advantage Estimation）
  - 8.2. 估计 $R_t$
- 附：最简 PyTorch 伪代码（批量 + GAE + 标准化 + entropy + grad clip）

---

## 0. 问题设定与记号

| 概念 | 数学形式 | 物理意义 |
|---|---|---|
| **状态** | $s_t$ | 系统在时刻 $t$ 的观测或环境信息，例如机器人位置、速度等。 |
| **动作** | $a_t$ | 智能体在状态 $s_t$ 下采取的操作，例如机器人移动一步。 |
| **参数化策略** | $\pi_\theta(a\|s)$ | 在状态 $s$ 下选择动作 $a$ 的概率分布，由参数 $\theta$ 控制；表示“行为习惯”。 |
| **折扣因子** | $\gamma\in[0,1)$ | 决定未来奖励的重要性，$\gamma=0$ 只关心当前，$\gamma\approx 1$ 长远考虑。 |
| **轨迹** | $\tau=(s_0,a_0,r_0,s_1,a_1,r_1,\dots)$ | 从初始状态开始，一次完整的经历记录，包括状态、动作和奖励序列。 |
| **轨迹奖励** | $R(\tau)=\sum_{t=0}^{\infty}\gamma^t r_t$ | 轨迹整体的好坏评价，未来奖励会按 $\gamma^t$ 折扣，越远的奖励影响越小。 |
| **策略目标** | $J(\theta)=\mathbb{E}_{\tau\sim p_\theta}[R(\tau)] = \int p_\theta(\tau) R(\tau)d\tau$ | 在策略 $\pi_\theta$ 下，$R(\tau)$ 的数学期望（所有可能轨迹的平均奖励）；即智能体的最大化目标。 |

### 0.1 对策略目标 $J(\theta)$ 的解释

- 期望就是“无限次重复实验的平均”。
- $\mathbb{E}_{\tau\sim p_\theta}[f(\tau)]$ 的物理意义：如果用策略 $\pi_\theta$ 在环境里跑无数遍，每次记录轨迹 $\tau$ 并计算 $f(\tau)$，则这些值的平均就是该期望。
- 积分代表把所有可能的轨迹按照它们发生的概率 $p_\theta(\tau)$ 加权平均。

### 0.2 对 $p_\theta(\tau)$ 的解释

策略 $\pi_\theta$ 下，轨迹 $\tau$ 发生的概率：

$$
p_\theta(\tau)=p(s_0)\prod_{t=0}^\infty \pi_\theta(a_t|s_t)\,P(s_{t+1}|s_t,a_t).
$$

- 一条事件链（马尔可夫链）的概率是各个事件条件概率的乘积。
- 上述事件有三种：
  - **初始状态** $p(s_0)$：环境状态初始为 $s_0$ 的概率。
  - **策略选择** $\pi_\theta(a_t|s_t)$：智能体在环境状态 $s_t$ 下选择动作 $a_t$ 的概率。
  - **环境转移** $P(s_{t+1}|s_t,a_t)$：智能体在环境状态 $s_t$ 下选择动作 $a_t$ 后，环境状态变化为 $s_{t+1}$ 的概率。

---

## 1. 对 $J(\theta)$ 求导

$J(\theta)$ 对 $\theta$ 的导数：

$$
\nabla_\theta J(\theta)=\nabla_\theta \int p_\theta(\tau)R(\tau)\,d\tau = \int \nabla_\theta p_\theta(\tau) R(\tau)\,d\tau.
$$

使用对数求导恒等式：
$$
\nabla_\theta\log p_\theta(\tau) = \dfrac{\nabla_\theta p_\theta(\tau)}{p_\theta(\tau)}.
$$

可变形为：

$$
\nabla_\theta J(\theta)=\int p_\theta(\tau)\,\nabla_\theta\log p_\theta(\tau)\,R(\tau)\,d\tau=\mathbb{E}_{\tau\sim p_\theta}[\nabla_\theta\log p_\theta(\tau)\,R(\tau)].
$$

进一步，展开 $\log p_\theta(\tau)$：

$$
\log p_\theta(\tau)=\log p(s_0)+\sum_{t=0}^\infty\log\pi_\theta(a_t\mid s_t)+\sum_{t=0}^\infty\log P(s_{t+1}\mid s_t,a_t).
$$

上式右边，第一项初始状态项、第三项环境转移项与 $\theta$ 无关，因此：

$$
\nabla_\theta\log p_\theta(\tau)=\nabla_\theta\sum_{t=0}^\infty \log\pi_\theta(a_t\mid s_t)=\sum_{t=0}^\infty \nabla_\theta\log\pi_\theta(a_t\mid s_t).
$$

代回得到：

$$
\boxed{\nabla_\theta J(\theta)=\mathbb{E}_{\tau\sim p_\theta}\Big[\sum_{t=0}^\infty \nabla_\theta\log\pi_\theta(a_t\mid s_t)\;R(\tau)\Big].}
$$

---

## 1.5. 一个关键恒等式

$$
\mathbb{E}_{a_t\sim\pi_\theta(\cdot\mid s_t)}\big[\nabla_\theta\log\pi_\theta(a_t\mid s_t)\big]=0.
$$

- 公式描述：在任意状态 $s_t$ 下，如果按照当前策略 $\pi_\theta$ 本身去采样动作，那么策略的“得分函数”（$\nabla_\theta\log\pi_\theta(a_t\mid s_t)$）在整体上是零均值的。

- 物理意义：
  - “得分函数”是动作 $a_t$ 的概率对 $\theta$ 的敏感度（当策略参数 $\theta$ 发生微小变化时，动作 $a_t$ 的对数概率会增大或减小多少）。对所有动作加权平均后，正负变化刚好抵消，不会产生系统性偏移。
  - 因此，“得分函数”本质上是一种 **零均值噪声基线**：单独出现时不带来任何期望上的梯度方向。
  - 这就是 **策略梯度成立的关键**：只有当这个零均值项与奖励信号（$R_t$ 或优势函数 $A_t$）相乘时，才能产生非零的期望梯度，从而推动策略向着更优方向更新。

- 证明：

对于固定状态 $s_t$：
$$
\mathbb{E}_{a_t\sim\pi_\theta(\cdot\mid s_t)}\big[\nabla_\theta\log\pi_\theta(a_t\mid s_t)\big]
= \sum_{a_t} \pi_\theta(a_t\mid s_t)\,\nabla_\theta\log\pi_\theta(a_t\mid s_t).
$$

使用对数求导恒等式：
$$
\nabla_\theta\log\pi_\theta(a_t\mid s_t) = \dfrac{\nabla_\theta\pi_\theta(a_t\mid s_t)}{\pi_\theta(a_t\mid s_t)}.
$$

可变形为：
$$
\mathbb{E}_{a_t\sim\pi_\theta(\cdot\mid s_t)}\big[\nabla_\theta\log\pi_\theta(a_t\mid s_t)\big]
=\sum_{a_t} \pi_\theta(a_t\mid s_t)\,\frac{\nabla_\theta\pi_\theta(a_t\mid s_t)}{\pi_\theta(a_t\mid s_t)} \\
= \sum_{a_t} \nabla_\theta\pi_\theta(a_t\mid s_t)
= \nabla_\theta\Big(\sum_{a_t} \pi_\theta(a_t\mid s_t)\Big)
= \nabla_\theta 1
= 0.
$$

---

## 2. 用逐步奖励 $R_t$ 替换轨迹总奖励 $R(\tau)$（只用未来奖励）

- 物理意义：在第 $t$ 步采取动作 $a_t$ 时，这个动作不会影响之前 \(0,1,...,t-1\) 时刻已经发生的奖励。

把 $R(\tau)$ 拆成过去部分（0 到 $t-1$）和未来部分（$t$ 及之后） ：

$$
R(\tau)=\underbrace{\sum_{k=0}^{t-1}\gamma^k r_k}_{C_t\text{（常数，对 }a_t\text{ 无关）}} + R_t,
$$

其中 $R_t=\sum_{k=0}^\infty \gamma^k r_{t+k}$ 是从 $t$ 时刻开始的未来奖励。（数学上严格为 $R_t=\gamma^t \sum_{k=0}^\infty \gamma^k r_{t+k}$，但实际采取前者）

得到：

$$
\begin{aligned}
\nabla_\theta J(\theta)
&=\mathbb{E}_{\tau \sim p_\theta} \big[\nabla_\theta \log \pi_\theta(a_t \mid s_t) \; R(\tau)\big] \\[4pt]
&=\mathbb{E}_{\tau \sim p_\theta} \big[\nabla_\theta \log \pi_\theta(a_t \mid s_t) \; C_t\big]+\mathbb{E}_{\tau \sim p_\theta} \big[\nabla_\theta \log \pi_\theta(a_t \mid s_t) \; R_t\big].
\end{aligned}
$$

再利用条件期望展开的公式（将对整条轨迹的期望转化为，先对 $s_t$ 的分布取期望，再对 $a_t$ 的策略分布取期望）：

$$
\mathbb{E}_{\tau \sim p_\theta}[f(a_t, s_t)]
=\mathbb{E}_{s_t \sim p_\theta} \Big[ \mathbb{E}_{a_t \sim \pi_\theta(\cdot \mid s_t)} \big[f(a_t, s_t) \mid s_t \big] \Big].
$$

得到：

$$
\mathbb{E}_{\tau \sim p_\theta}\big[\nabla_\theta \log \pi_\theta(a_t \mid s_t) \; C_t \big]
=\mathbb{E}_{s_t \sim p_\theta} \Big[ \mathbb{E}_{a_t \sim \pi_\theta(\cdot \mid s_t)} \big[\nabla_\theta \log \pi_\theta(a_t \mid s_t) \; C_t \big] \Big]=0.
$$

因此最终得到：

$$
\boxed{\nabla_\theta J(\theta)=\mathbb{E}_{\tau\sim p_\theta}\Big[\sum_{t=0}^\infty \nabla_\theta\log\pi_\theta(a_t\mid s_t)\;R_t\Big].}
$$

---

## 2.5. 价值函数

### 2.5.1. 状态价值函数

定义状态价值函数 $V^{\pi}(s)$。它表示在状态 $s$ 下，如果此后按策略 $\pi$ 行动，平均（对未来随机性取期望）能得到的折扣累积奖励。

>状态价值函数只依赖状态 $s$（和策略 $\pi$）。

$$
V^{\pi}(s)=\mathbb{E}_{\tau \sim p_{\pi}(\tau \mid s_{0} = s)}\Big[ \sum_{k=0}^{\infty} \gamma^{k} r_{t+k} \Big]=\mathbb{E}\Big[ R_t \mid s_t = s \Big].
$$

从整条轨迹的角度，$\mathbb{E}_{\tau \sim p_{\pi}(\tau \mid s_{0} = s)}\Big[ \sum_{k=0}^{\infty} \gamma^{k} r_{t+k} \Big]$ 表示：在所有可能的轨迹 $\tau = (s_0, a_0, r_0, s_1, a_1, r_1, \dots)$ 上取期望，这些轨迹以 $s_0 = s$ 为起点，由策略 $\pi$ 决定动作分布，由环境 $P$ 决定状态演化，在这个轨迹分布下，计算从 $t$ 时刻起的未来累积奖励的期望。

从单步开始的角度，$\mathbb{E}\Big[ R_t \mid s_t = s \Big]$ 表示：从 $s_t = s$ 开始，未来所有动作由策略 $\pi$ 采样，未来所有状态由环境 $P$ 采样，在这个由 $\pi$ 和 $P$ 共同决定的随机轨迹分布下，未来累积奖励 $R_t$ 的条件期望。

### 2.5.2. 动作价值函数

定义动作价值函数 $Q^{\pi}(s,a)$。它表示在状态 $s$ 下，立即采取动作 $a$，然后按策略 $\pi$ 行动，平均（对未来随机性取期望）能得到的折扣累积奖励。

>动作价值函数依赖状态 $s$ 和动作 $a$（以及策略 $\pi$）。

$$
Q^{\pi}(s,a)=\mathbb{E}_{\tau \sim p_{\pi}(\tau \mid s_{0} = s, a_{0} = a)}\Big[ \sum_{k=0}^{\infty} \gamma^{k} r_{t+k} \Big]=\mathbb{E}\Big[ R_t \mid s_t = s, a_t = a \Big].
$$

$\mathbb{E}\Big[ R_t \mid s_t = s, a_t = a \Big]$ 表示：从 $s_t = s$ 开始，立即采取动作 $a_t = a$，未来所有动作由策略 $\pi$ 采样，未来所有状态由环境 $P$ 采样，在这个由 $\pi$ 和 $P$ 共同决定的随机轨迹分布下，未来累积奖励 $R_t$ 的条件期望。

---

## 3. 用优势函数 $A_t$ 替换逐步回报 $R_t$（引入baseline减少方差）

若 $b(s_t)$ 仅依赖状态 $s_t$，则：

$$
\mathbb{E}_{a_t\sim\pi_\theta(\cdot\mid s_t)}[\nabla_\theta\log\pi_\theta(a_t\mid s_t)\, b(s_t)] = b(s_t)\;\mathbb{E}_{a_t\sim\pi_\theta(\cdot\mid s_t)}[\nabla_\theta\log\pi_\theta(a_t\mid s_t)] = 0.
$$

因此可以把 $R_t$ 替换为 $R_t-b(s_t)$，即：

$$
\begin{aligned}
\nabla_\theta J(\theta)
&=\mathbb{E}_{\tau\sim p_\theta}\Big[\sum_{t=0}^\infty \nabla_\theta\log\pi_\theta(a_t\mid s_t)\;R_t\Big] \\
&=\mathbb{E}_{\tau\sim p_\theta}\Big[\sum_{t=0}^\infty \nabla_\theta\log\pi_\theta(a_t\mid s_t)\;(R_t - b(s_t))\Big].
\end{aligned}
$$

取 $b(s_t)=V^\pi(s_t)$，定义优势函数 $A_t$：

$$
A_t = R_t - V^\pi(s_t).
$$

因此最终得到：

$$
\boxed{\nabla_\theta J(\theta)=\mathbb{E}_{\tau\sim p_\theta}\Big[\sum_{t=0}^\infty \nabla_\theta\log\pi_\theta(a_t\mid s_t)\;A_t\Big].}
$$

这里的 $A_t$ 是采样优势。

采样优势 $A_t$ 表示：在轨迹 $\tau$ 中，当前采取的动作 $a_t$ 和随后的随机性导致的真实（样本）回报 $R_t$，相比于在同一状态下按策略的平均期待 $V^\pi(s_t)$，多了多少或少了多少。

期望优势：

$$
A^\pi(s,a) = Q^\pi(s,a) - V^\pi(s).
$$

期望优势 $A^\pi(s,a)$ 表示：在状态 $s$ 下，立即采取动作 $a$，然后按策略 $\pi$ 行动，平均（对未来随机性取期望）能得到的折扣累积奖励 $Q^\pi(s,a)$，相比于在同一状态 $s$ 下按策略 $\pi$ 行动的平均期待 $V^\pi(s)$，多了多少或少了多少（如果你在状态 $s$ 总是选动作 $a$，平均上比总统策略好多少）。

采样优势 $A_t$ 是期望优势 $A^\pi(s_t,a_t)$ 的无偏样本估计（确定轨迹）；期望优势 $A^\pi(s_t,a_t)$ 是采样优势 $A_t$ 的条件期望：

$$
A^\pi(s_t,a_t)=\mathbb{E}\Big[ A_t \mid s_t, a_t \Big]
$$

---

## 4. Actor - Critic 网络

引入网络的目的是参数化一些东西，并用样本来学习参数。

- **Actor**：参数化 **策略** $\pi_\theta(a \mid s)$，决定动作的分布，即负责做动作。
- **Critic**：参数化 **状态价值函数** $V_\phi(s)$，作为估计基线。

$$
V_\phi(s) \approx V^\pi(s).
$$

工作流程：

1. 用 Actor 与环境交互得到样本；
2. Critic 用样本计算 TD 目标并学习 $V_\phi$；
3. Actor 用 Critic 的估计（advantage）更新策略。

比喻：演员（Actor）表演，评论家（Critic）评分，演员根据评分改进表演。

---

## 4.5. 对经典目标函数做变换

$$
\boxed{\nabla_\theta J(\theta)=\mathbb{E}_{\tau\sim p_\theta}\Big[\sum_{t=0}^\infty \nabla_\theta\log\pi_\theta(a_t\mid s_t)\;A_t\Big].}
$$

- 外层的 $\mathbb{E}_{\tau\sim p_\theta}$：整条轨迹 $\tau = (s_0,a_0,r_0,s_1,\dots)$ 来自策略 $\pi_\theta$ 和环境 $P$ 共同决定的分布。

- 内层的 $\sum_{t=0}^\infty$：对每条轨迹，我们要把所有时刻 $t$ 的项都加起来。

第一，提出求和符号：

$$
\nabla_\theta J(\theta)=\sum_{t=0}^\infty \mathbb{E}_{\tau\sim p_\theta}\Big[\nabla_\theta\log\pi_\theta(a_t\mid s_t)\;A_t\Big].
$$

对轨迹取期望时，虽然轨迹很长，但我们只需要“第 $t$ 步时的 $(s_t,a_t)$”的分布。也就是说，每一项只依赖于 $(s_t,a_t)$，不需要整个 $\tau$。

第二，引入边缘分布：

$$
\nabla_\theta J(\theta)=\sum_{t=0}^\infty \mathbb{E}_{(s_t,a_t)\sim p_\theta(s_t,a_t)}\Big[\nabla_\theta\log\pi_\theta(a_t\mid s_t)\;A_t\Big].
$$

其中 $p_\theta(s_t,a_t)$ 就是在策略 $\pi_\theta$ 下，环境运行到第 $t$ 步时 $(s_t,a_t)$ 的分布。它是轨迹分布 $p_\theta(\tau)$ 的一个边缘分布。

---

## 5. 重要性采样

### 5.1. 问题背景

$$
\begin{aligned}
\nabla_\theta J(\theta)
&=\mathbb{E}_{\tau\sim p_\theta}\Big[\sum_{t=0}^\infty \nabla_\theta\log\pi_\theta(a_t\mid s_t)\;A_t\Big] \\
&=\sum_{t=0}^\infty \mathbb{E}_{(s_t,a_t)\sim p_\theta(s_t,a_t)}\Big[\nabla_\theta\log\pi_\theta(a_t\mid s_t)\;A_t\Big].
\end{aligned}
$$

在策略梯度方法中，我们的目标是最大化新策略 $\pi_\theta$ 下的期望回报。在强化学习训练中，我们通常使用经验回放或者已有的轨迹数据，这些轨迹是按照旧策略 $\pi_{\theta_{\text{old}}}$ 采样的，这就带来了 **分布不一致** 的问题：采样自旧策略，但优化目标却依赖于新策略。

- **采样分布**：来自旧策略 $\pi_{\theta_{\text{old}}}$。
- **优化目标**：需要新策略 $\pi_\theta$ 下的期望。

为了在旧数据上仍能优化新策略，我们需要一种数学工具来“修正”分布不一致问题 —— **重要性采样**（Importance Sampling，IS）。

### 5.2. 重要性采样原理

重要性采样的基本思想：

如果我们想计算某个分布 $p(x)$ 下的期望，但只能从另一个分布 $q(x)$ 采样，可以通过引入修正系数 $\tfrac{p(x)}{q(x)}$ 来进行修正：

$$
\mathbb{E}_{x\sim p}[f(x)]
= \mathbb{E}_{x\sim q}\Bigg[\frac{p(x)}{q(x)} f(x)\Bigg].
$$

物理意义：

- 我们本来想在 $p(x)$ 下算平均值，但数据来自 $q(x)$；
- 所以给每个样本一个权重 $\frac{p(x)}{q(x)}$，让它“看起来像”是从 $p(x)$ 采样的。

在策略优化问题中：

- **目标分布** $p$：新策略 $\pi_\theta$ 所定义的 $(s_t,a_t)$ 分布；
- **采样分布** $q$：旧策略 $\pi_{\theta_{\text{old}}}$ 所定义的 $(s_t,a_t)$ 分布。

于是，修正系数就是 **重要性比率**（importance ratio）：

$$
r_t(\theta) = \frac{p(x)}{q(x)}=\frac{\pi_\theta(a_t\mid s_t)}{\pi_{\theta_{\text{old}}}(a_t\mid s_t)}.
$$

它衡量了：在同一个状态 $s_t$ 下，新策略与旧策略对动作 $a_t$ 的概率有多大差别。

在策略优化中，这个原理应用为：

$$
\begin{aligned}
\nabla_\theta J(\theta)
&= \sum_{t=0}^\infty \mathbb{E}_{(s_t,a_t)\sim p_{\theta_{\text{old}}}(s_t,a_t)}
\Big[r_t(\theta)\,\nabla_\theta \log \pi_\theta(a_t\mid s_t)\,A_t\Big] \\
&= \sum_{t=0}^\infty \mathbb{E}_{(s_t,a_t)\sim p_{\theta_{\text{old}}}(s_t,a_t)}
\Bigg[\frac{\pi_\theta(a_t\mid s_t)}{\pi_{\theta_{\text{old}}}(a_t\mid s_t)}\,\nabla_\theta \log \pi_\theta(a_t\mid s_t)\,A_t\Bigg].
\end{aligned}
$$

通常简写为：
$$
\nabla_\theta J(\theta)=\mathbb{E}_{t}
\Bigg[\frac{\pi_\theta(a_t\mid s_t)}{\pi_{\theta_{\text{old}}}(a_t\mid s_t)}\,\nabla_\theta \log \pi_\theta(a_t\mid s_t)\,A_t\Bigg].
$$

### 5.3. surrogate objective 的提出

替代目标函数（surrogate objective）：

$$
L_{\text{PG}}(\theta)
=\mathbb{E}_t\big[r_t(\theta)\,A_t\big]
=\mathbb{E}_t\Bigg[\frac{\pi_\theta(a_t\mid s_t)}{\pi_{\theta_{\text{old}}}(a_t\mid s_t)}\,A_t\Bigg].
$$

$$
\begin{aligned}
\nabla_\theta L_{\text{PG}}(\theta)
&= \mathbb{E}_t\big[ \nabla_\theta r_t(\theta)\; A_t \big] \\[4pt]
&= \mathbb{E}_t\!\left[ \nabla_\theta\!\left(\frac{\pi_\theta(a_t\mid s_t)}{\pi_{\theta_{\text{old}}}(a_t\mid s_t)}\right)\! A_t \right] \\[4pt]
&= \mathbb{E}_t\!\left[ \frac{1}{\pi_{\theta_{\text{old}}}(a_t\mid s_t)}\; \nabla_\theta\pi_\theta(a_t\mid s_t)\; A_t \right] \\[4pt]
&= \mathbb{E}_t\!\left[ \frac{\pi_\theta(a_t\mid s_t)}{\pi_{\theta_{\text{old}}}(a_t\mid s_t)}\; \nabla_\theta\log\pi_\theta(a_t\mid s_t)\; A_t \right] \\[4pt]
&= \mathbb{E}_t\big[ r_t(\theta)\, \nabla_\theta\log\pi_\theta(a_t\mid s_t)\, A_t \big].
\end{aligned}
$$

### 5.4. surrogate objective 的一阶一致性

为什么这个 surrogate objective 是合理的？

当 $\theta = \theta_{\text{old}}$ 时：

$$
r_t(\theta) = 1,
$$

于是目标变为：

$$
L_{\text{PG}}(\theta_{\text{old}})
= \mathbb{E}_t[A_t].
$$

在这个点（$r_t(\theta) = 1$），$L_{\text{PG}}(\theta)$ 的一阶导数和原始目标的一阶导数完全一致，因此称为 **一阶一致性**。这意味着我们用 $L_{\text{PG}}(\theta)$ 替代原目标进行优化时，至少在 **小步更新** 时方向是一致的。

---

## 6. 信赖域思想（TRPO）

如果直接对原始策略梯度目标函数 $L_{\text{PG}}(\theta)$ 进行多次大步更新，新的策略可能会偏离旧策略过远，导致重要性采样比值 $r_t(\theta)$ 的方差急剧增大，使训练过程不稳定甚至崩溃。  

为了限制策略更新的幅度，**TRPO（Trust Region Policy Optimization）** 将优化问题改写为带 **KL 散度约束** 的形式：

$$
\begin{aligned}
\max_\theta \quad & L_{\text{PG}}(\theta)
= \mathbb{E}_t \!\left[ r_t(\theta)\,A_t \right], \\[6pt]
\text{s.t.} \quad &
\mathbb{E}_{s_t \sim d^{\pi_{\theta_{\text{old}}}}}
\Big[ \mathrm{KL}\!\left(\pi_{\theta_{\text{old}}}(\cdot\mid s_t)\,\|\,\pi_\theta(\cdot\mid s_t)\right) \Big]
\;\le\; \delta,
\end{aligned}
$$

其中：

- $d^{\pi_{\theta_{\text{old}}}}(s)$：旧策略 $\pi_{\theta_{\text{old}}}$ 在环境中诱导的 **状态分布**，也称为 **折扣访问分布**：

  $$
  d^{\pi}(s) = (1-\gamma)\sum_{t=0}^\infty \gamma^t \Pr(s_t = s \mid \pi).
  $$

  直观上，它表示在策略 $\pi$ 下访问到状态 $s$ 的概率权重。
- 约束中的期望 $\mathbb{E}_{s_t \sim d^{\pi_{\theta_{\text{old}}}}}$ 表示：在旧策略生成的轨迹中统计状态分布，并在这些状态上计算新旧策略之间的 KL 散度。
- $\delta$ 是一个预设的阈值，用来限制新旧策略之间的平均 KL 散度，从而保证更新步子不会太大。
- 约束项控制新旧策略的平均 KL 散度不超过阈值 $\delta$，从而保证更新步长在“信赖域”范围内。  
- 由于约束涉及 KL 散度的二阶展开，需要用到 **Fisher 信息矩阵** 来近似，通常通过 **共轭梯度法（Conjugate Gradient）** 求解，因而实现复杂、计算开销较大。

---

## 7. 裁剪思想（PPO）与最终损失

从基础 surrogate objective 出发：
$$
L_{\text{PG}}(\theta)
=\mathbb{E}_t\big[r_t(\theta)\,A_t\big]
=\mathbb{E}_t\Bigg[\frac{\pi_\theta(a_t\mid s_t)}{\pi_{\theta_{\text{old}}}(a_t\mid s_t)}\,A_t\Bigg].
$$

PPO（clipped 版本）使用裁剪的 surrogate：
$$
L^{\mathrm{CLIP}}(\theta)
= \mathbb{E}_t\Big[ \min\big( r_t(\theta)\,\hat A_t,\; \operatorname{clip}(r_t(\theta),1-\epsilon,1+\epsilon)\,\hat A_t \big) \Big],
$$
其中 $\hat A_t$ 是对优势 $A_t$ 的样本估计，$\epsilon>0$ 是裁剪阈值（常见值例如 $0.1\text{–}0.3$）。

为了同时学习价值函数（Critic）并鼓励探索，PPO 的**最终训练损失**（以“最小化”为准）通常写成：

$$
\mathcal{L}(\theta,\phi)
= -\mathbb{E}_t\big[L^{\mathrm{CLIP}}(\theta)\big]
\;+\; c_1\,\mathbb{E}_t\big[ \big(V_\phi(s_t) - R_t\big)^2 \big] \\[4pt]
-\; c_2\,\mathbb{E}_t\big[ \mathcal{H}(\pi_\theta(\cdot\mid s_t)) \big]
$$

- 第一项（带负号）是策略损失：我们最大化 $L^{\mathrm{CLIP}}$，等价于最小化其负值。  
- 第二项是值函数的均方误差（MSE）：将参数化值函数 $V_\phi$ 拟合到回报目标 $R_t$。系数 $c_1$ 控制权重。  
- 第三项是策略熵（entropy）正则：$\mathcal{H}(\pi)$ 表示策略在状态 $s_t$ 的熵，负号表示我们最大化熵以**鼓励探索**（因此再写成最小化时为减项）。系数 $c_2$ 控制熵项权重（常小，如 $10^{-3}\text{–}10^{-2}$）。

通常的训练步骤：

1. 用旧策略 $\pi_{\theta_{\mathrm{old}}}$ 与环境交互收集一批轨迹（或若干步的 transitions）；计算 $\hat A_t$（例如用 GAE）、并计算 $R_t$（用于 value regression）。  
2. 在该批数据上多次（epochs）随机打批（mini-batch）更新 $(\theta,\phi)$，用上面的损失做梯度下降/Adam 等优化。  
3. 更新完成后把 $\theta_{\mathrm{old}}\leftarrow\theta$，重复采样-更新循环。

---

## 8. 估计方法

在最终损失函数中：

$$
\mathcal{L}(\theta,\phi)
= -\mathbb{E}_t\big[L^{\mathrm{CLIP}}(\theta)\big]
\;+\; c_1\,\mathbb{E}_t\big[ \big(V_\phi(s_t) - R_t\big)^2 \big] \\[4pt]
-\; c_2\,\mathbb{E}_t\big[ \mathcal{H}(\pi_\theta(\cdot\mid s_t)) \big],
$$

其中，$r_t(\theta)$、$\mathcal{H}(\pi_\theta(\cdot\mid s_t))$ 是直接可计算量。

$$
r_t(\theta) = \frac{\pi_\theta(a_t \mid s_t)}{\pi_{\theta_{\mathrm{old}}}(a_t \mid s_t)}.
$$

$$
\mathcal{H}(\pi_\theta(\cdot\mid s_t)) = -\sum_a \pi_\theta(a \mid s_t)\,\log \pi_\theta(a \mid s_t).
$$

但 $\hat A_t$ 和 $R_t$ 需要估计。

### 8.1. 估计 $\hat A_t$

理论定义：

$$
A^\pi(s,a) = Q^\pi(s,a) - V^\pi(s).
$$

但无法直接计算，需构造近似 $\hat A_t$。常用方法：

#### 8.1.1. 单步 TD 残差（1-step TD）

定义：

$$
\delta_t \;=\; r_t + \gamma\,V_\phi(s_{t+1}) - V_\phi(s_t).
$$

- 把 $Q^\pi(s_t,a_t)$ 用 $r_t+\gamma V_\phi(s_{t+1})$ 近似（即用一步回报 + 引导到下一个状态的估值来逼近长期价值）。  
- 因而 $\delta_t$ 近似等于 $Q^\pi(s_t,a_t)-V_\phi(s_t)$，即近似优势（若 $V_\phi\approx V^\pi$，则近似无偏）。

在理想状况下，$V_\phi=V^\pi$（critic 精确），则

$$
\mathbb{E}[\delta_t \mid s_t,a_t]=\mathbb{E}[r_t + \gamma V^\pi(s_{t+1}) - V^\pi(s_t)\mid s_t,a_t] \\[4pt]
=\mathbb{E}[r_t + \gamma V^\pi(s_{t+1})\mid s_t,a_t] - V^\pi(s_t),
$$

根据前面：

$$
R_t=\sum_{k=0}^\infty \gamma^k r_{t+k}=r_t + \gamma R_{t+1},
$$

$$
V^{\pi}(s)=\mathbb{E}\Big[ R_t \mid s_t = s \Big],
$$

$$
Q^{\pi}(s,a)=\mathbb{E}\Big[ R_t \mid s_t = s, a_t = a \Big].
$$

所以：

$$
V^{\pi}(s_{t+1})=\mathbb{E}\Big[ R_{t+1} \mid s_{t+1} \Big].
$$

$$
Q^{\pi}(s_t,a_t)=\mathbb{E}\Big[ r_t + \gamma R_{t+1}\mid s_t, a_t \Big].
$$

然后：

$$
\mathbb{E}[\delta_t \mid s_t,a_t] = \mathbb{E}[r_t + \gamma V^\pi(s_{t+1}) - V^\pi(s_t)\mid s_t,a_t] \\[4pt]
= Q^\pi(s_t,a_t) - V^\pi(s_t) = A^\pi(s_t,a_t).
$$

在理想状况下 $\delta_t$ 是 $A^\pi$ 的无偏估计。

**优缺点**：

- 方差小（只看一步随机），但若 $V_\phi$ 有误差，则会有偏差（bias）。
- 计算开销小，适合在线更新。

#### 8.1.2. 蒙特卡洛回报（full return）

定义：
$$
G_t \;=\; \sum_{l=0}^{T-t-1} \gamma^l r_{t+l},
\qquad \hat A_t^{\text{MC}} = G_t - V_\phi(s_t).
$$

- $G_t$ 是从 $t$ 时刻开始直到轨迹结束（或截断点）的折扣累计真实回报。  
- 用 $G_t - V_\phi(s_t)$ 作为优势估计，相当于直接用样本回报减去基线 $V_\phi$。

在理想状况下，$G_t=R_t$（无截断），则：

$$
\mathbb{E}[G_t\mid s_t,a_t]=Q^\pi(s_t,a_t)
$$

在理想状况下 $\hat A_t^{\text{MC}}$ 是 $A^\pi$ 的无偏估计。

**优缺点**：

- 方差通常很大（因为包含未来多个随机奖励）。
- 当轨迹短、方差可控或想要无偏估计时使用（但多用于离线批量或小环境）。

#### 8.1.3. GAE（Generalized Advantage Estimation）

定义（常见形式）：

$$
\hat A_t^{\text{GAE}(\gamma,\lambda)} \;=\; \sum_{l=0}^{\infty} (\gamma\lambda)^l \,\delta_{t+l},
$$

其中 $\delta_{t+l}=r_{t+l}+\gamma V_\phi(s_{t+l+1})-V_\phi(s_{t+l})$ 为单步 TD 残差，参数 $\lambda\in[0,1]$ 控制 **偏差 - 方差折中**。

**为什么这样定义**：

- 当 $\lambda=0$：GAE 退化到单步 TD，即 $\hat A_t=\delta_t$（低方差但高偏差）。
- 当 $\lambda\to1$：GAE 逼近全回报 $G_t-V_\phi(s_t)$（低偏差但高方差）。
- 所以 $\lambda$ 在 $[0,1]$ 上平滑地在偏差与方差之间折中。经验上 $\lambda\approx 0.95$ 常见效果好。

证明：当 $\lambda\to1$：GAE 逼近全回报 $G_t-V_\phi(s_t)$

$$
\begin{aligned}
\hat A_t^{\lambda=1} &= \sum_{l=0}^\infty \gamma^l \big(r_{t+l} + \gamma V(s_{t+l+1}) - V(s_{t+l})\big) \\[4pt]
&=\sum_{l=0}^\infty \gamma^l r_{t+l}+\sum_{l=0}^\infty \big(\gamma^{l+1} V(s_{t+l+1}) - \gamma^l V(s_{t+l})\big) \\[4pt]
&=G_t-V_\phi(s_t).
\end{aligned}
$$

**等价视角（k-step returns 的几何加权）**：

令 $R_t^{(k)}$ 为 $k$ 步回报加上第 $t+k$ 步的引导值（k-step bootstrap），即走 $k$ 步真实奖励，再在第 $t+k$ 步用值函数 $V_\phi$ 来补上“未来”的近似：

$$
R_t^{(k)}=\sum_{l=0}^{k-1}\gamma^l r_{t+l} + \gamma^k V_\phi(s_{t+k}).
$$

则 $k$ 步的 advantage 为 $R_t^{(k)}-V_\phi(s_t)$，并有关系：

$$
R_t^{(k)}-V_\phi(s_t)=\sum_{l=0}^{k-1}\gamma^l \delta_{t+l}.
$$

证明：

$$
\sum_{l=0}^{k-1}\gamma^l \delta_{t+l}
= \sum_{l=0}^{k-1}\gamma^l\Big( r_{t+l} + \gamma V_\phi(s_{t+l+1}) - V_\phi(s_{t+l}) \Big) \\[4pt]
=\underbrace{\sum_{l=0}^{k-1}\gamma^l r_{t+l}}_{\text{奖励项}}
+\underbrace{\sum_{l=0}^{k-1}\gamma^{l+1}V_\phi(s_{t+l+1})}_{\text{未来值项}}
-\underbrace{\sum_{l=0}^{k-1}\gamma^l V_\phi(s_{t+l})}_{\text{当前值项}} \\[4pt]
=\sum_{l=0}^{k-1}\gamma^l r_{t+l}
-V_\phi(s_t) + \gamma^k V_\phi(s_{t+k}) \\[4pt]
=R_t^{(k)}-V_\phi(s_t).
$$

GAE 可以写成对不同 k-step advantage 的几何加权：

$$
\hat A_t^{\text{GAE}} \;=\; (1-\lambda)\sum_{k=1}^\infty \lambda^{\,k-1}\big(R_t^{(k)}-V_\phi(s_t)\big),
$$

等价于 $\sum_{l=0}^\infty (\gamma\lambda)^l\delta_{t+l}$。

证明：

$$
\boxed{\, (1-\lambda)\sum_{k=1}^\infty \lambda^{k-1}\big(R_t^{(k)}-V_\phi(s_t)\big)
\;=\;\sum_{l=0}^\infty (\gamma\lambda)^l\,\delta_{t+l}\,}
$$

把 $R_t^{(k)}-V_\phi(s_t)$ 的表达代入左边：

$$
\begin{aligned}
(1-\lambda)\sum_{k=1}^\infty \lambda^{k-1}\big(R_t^{(k)}-V_\phi(s_t)\big)
&= (1-\lambda)\sum_{k=1}^\infty \lambda^{k-1}\Big(\sum_{l=0}^{k-1}\gamma^l\delta_{t+l}\Big).
\end{aligned}
$$

把求和次序互换（先对 $l$ 求和，再对 $k$）—— 严格情形下需 $\sum_{k,l} |\cdot|<\infty$ 或 $|\gamma\lambda|<1$ 保证绝对收敛，下面为正规换序步骤：

$$
(1-\lambda)\sum_{k=1}^\infty \sum_{l=0}^{k-1} \lambda^{k-1}\gamma^l\delta_{t+l}
= (1-\lambda)\sum_{l=0}^\infty \sum_{k=l+1}^{\infty} \lambda^{k-1}\gamma^l\delta_{t+l}.
$$

（这里把原来的双和域 $\{(k,l): k\ge1,\;0\le l\le k-1\}$ 用等价域 \(\{(l,k): l\ge0,\;k\ge l+1\}\) 表示，交换求和次序。）

对内层关于 $k$ 的几何级数求和：

$$
\sum_{k=l+1}^{\infty}\lambda^{k-1} = \lambda^{l}\sum_{m=0}^\infty \lambda^{m} = \lambda^{l}\cdot\frac{1}{1-\lambda},
$$

这里令 $m=k-l-1$。要求 $|\lambda|<1$。

把上式代回并消去因子 $(1-\lambda)$：

$$
\begin{aligned}
(1-\lambda)\sum_{l=0}^\infty \gamma^l\delta_{t+l}\cdot\left(\sum_{k=l+1}^{\infty}\lambda^{k-1}\right)
&= (1-\lambda)\sum_{l=0}^\infty \gamma^l\delta_{t+l}\cdot\left(\lambda^{l}\frac{1}{1-\lambda}\right)\\
&= \sum_{l=0}^\infty (\gamma\lambda)^l \delta_{t+l}.
\end{aligned}
$$

这就是右边的形式，证毕。

### 8.2. 估计 $R_t$

用于 Critic 的回归目标。常见构造方式：

- **蒙特卡洛法**：直接用累计回报 $G_t$。  
- **Bootstrapping**：用 $\hat A_t + V_\phi(s_t)$。

后一种常与 GAE 配合使用，效果更稳定。

---

## 附：最简 PyTorch 伪代码（批量 + GAE + 标准化 + entropy + grad clip）

```python
# 伪代码：略去环境交互细节，展示训练步骤
import torch
from torch import nn, optim

# actor returns probs (softmax), critic returns V(s)
# assume collected batch of transitions: states, actions, rewards, next_states, dones

# 1. compute V(s), V(s')
V_s = critic(states).squeeze(-1)          # shape (B,)
V_s_next = critic(next_states).squeeze(-1).detach()

# 2. compute deltas and GAE
deltas = rewards + gamma * V_s_next * (1 - dones) - V_s
advantages = compute_gae(deltas, dones, gamma, lam)  # implement as reversed recursion
advantages = (advantages - advantages.mean())/(advantages.std()+1e-8)

# 3. compute value targets
value_targets = advantages + V_s

# 4. compute policy outputs and ratios
probs = actor(states)            # shape (B, A)
dist = Categorical(probs)
log_probs = dist.log_prob(actions)  # shape (B,)
rats = torch.exp(log_probs - old_log_probs)

# 5. clipped surrogate
surr1 = rats * advantages
surr2 = torch.clamp(rats, 1-eps, 1+eps) * advantages
policy_loss = -torch.mean(torch.min(surr1, surr2))

# 6. value loss and entropy
value_loss = F.mse_loss(critic(states).squeeze(-1), value_targets)
entropy_loss = -torch.mean(dist.entropy())

loss = policy_loss + c1 * value_loss + c2 * entropy_loss

# 7. backward and step (with grad clip)
optimizer.zero_grad()
loss.backward()
torch.nn.utils.clip_grad_norm_(actor.parameters(), max_norm)
optimizer.step()
```
